pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeFactory.sol";

// Throw when if sender is not distributor
error OnlyDistributorError();

// Throw when sender is not controller
error OnlyControllerError();

// Throw when transaction fails
error TransferFailedError();

// Throw when submitted recipient with address(0)
error NullAddressRecipientError();

// Throw when arrays are submit without same length
error InconsistentDataLengthError();

// Throw when distributor address is same as submit one
error ControllerAlreadyConfiguredError();

// Throw when change is triggered for immutable controller
error ImmutableControllerError();

// Throw if recipient is already in the recipients pool
error RecipientAlreadyAddedError();

error ImmutableRecipientsError();

contract Invoice is OwnableUpgradeable{
    using SafeERC20 for IERC20;
    
    mapping(address => bool) public distributors;
    address public controller;
    IFeeFactory public factory;
    address public supportedToken;
    bool public isImmutableRecipients;
    uint256 public platformFee;
    uint256 public totalAmount;
    bool isNativeDistribution;

    mapping(address => uint256) public recieveAmount;
    address payable[] public recipients;

    struct InitContractSetting {
        address owner;
        address controller;
        address[] distributors;
        bool isImmutableRecipients;
        address payable [] initialRecipients;
        address token;
        uint256[] amounts;
        uint256 platformFee;
        address factory;
    }

    event SetRecipients(address payable[] recipients, uint256[] maxCaps);
    event DistributeToken(address token, uint256 amount);
    event DistributorChanged(address distributor, bool isDistributor);
    event ControllerChanged(address oldController, address newController);
    event DistributeNativeToken(uint256 amount);

    /**
     * @dev Throws if sender is not distributor
     */
    modifier onlyDistributor() {
        if (distributors[msg.sender] == false) {
            revert OnlyDistributorError();
        }
        _;
    }

    /**
     * @dev Checks whether sender is controller
     */
    modifier onlyController() {
        if (msg.sender != controller) {
            revert OnlyControllerError();
        }
        _;
    }

    modifier onlyImmutableRecipients() {
        if (isImmutableRecipients) {
            revert ImmutableRecipientsError();
        }
        _;
    }

    function initialize(
        InitContractSetting calldata _settings
    ) public initializer {
        controller = _settings.controller;

        uint256 distributorsLength = _settings.distributors.length;
        for (uint256 i = 0; i < distributorsLength; ) {
            distributors[_settings.distributors[i]] = true;
            unchecked {
                i++;
            }
        }
        platformFee = _settings.platformFee;
        isImmutableRecipients = _settings.isImmutableRecipients;

        factory = IFeeFactory(_settings.factory);
        _transferOwnership(_settings.owner);
        if (_settings.token == address(0)) {
            isNativeDistribution = true;
        } else {
            supportedToken = _settings.token;
        }
        supportedToken = _settings.token;
        // Recipients settings
        _setRecipients(_settings.initialRecipients, _settings.amounts);
    }

    /**
     * @notice External function to return number of recipients
     */
    function numberOfRecipients() external view returns (uint256) {
        return recipients.length;
    }

    /**
     * @notice External function to set distributor address
     * @param _distributor address of new distributor
     * @param _isDistributor bool indicating whether address is / isn't distributor
     */
    function setDistributor(
        address _distributor,
        bool _isDistributor
    ) external onlyOwner {
        emit DistributorChanged(_distributor, _isDistributor);
        distributors[_distributor] = _isDistributor;
    }

    /**
     * @notice External function to set controller address, if set to address(0), unable to change it
     * @param _controller address of new controller
     */
    function setController(address _controller) external onlyOwner {
        if (controller == address(0)) {
            revert ImmutableControllerError();
        }
        if (_controller == controller) {
            revert ControllerAlreadyConfiguredError();
        }
        emit ControllerChanged(controller, _controller);
        controller = _controller;
    }

    /**
     * @notice External function for setting recipients
     * @param _newRecipients Addresses to be added
     * @param _maxCaps Maximum amount recipient will receive
     */
    function setRecipients(
        address payable[] memory _newRecipients,
        uint256[] memory _maxCaps
    ) public onlyController onlyImmutableRecipients {
        _setRecipients(_newRecipients, _maxCaps);
    }

    function lockRecipients() public onlyOwner onlyImmutableRecipients {
        isImmutableRecipients = true;
    }

    /**
     * @notice External function to redistribute native token based on waterfall rules
     */
    function redistributeNativeToken() external onlyDistributor {
        if (!isNativeDistribution) {
            return;
        }
        uint256 balance = address(this).balance;
        if (balance == 0) {
            // Nothing to distribute
            return;
        }
        _redistributeNativeToken(balance);
    }    

    /**
     * @notice External function to redistribute ERC20 token based on waterfall rules
     */
    function redistributeToken() external onlyDistributor {
        if (isNativeDistribution) {
            return;
        }
        _redistributeToken();
    }

    /**
     * @notice Internal function enable adding new recipient.
     * @param _recipient New recipient address to be added
     * @param _maxCap max cap of new recipient provided in USD
     */
    function _addRecipient(
        address payable _recipient,
        uint256 _maxCap
    ) internal {
        if (_recipient == address(0)) {
            revert NullAddressRecipientError();
        } else if (recieveAmount[_recipient] > 0) {
            revert RecipientAlreadyAddedError();
        }

        recipients.push(_recipient);
        recieveAmount[_recipient] = _maxCap;
    }

    /**
     * @notice Internal function for setting recipients
     * @param _newRecipients Recipient addresses to be added
     * @param _maxCaps List of maxCaps for recipients
     */
    function _setRecipients(
        address payable[] memory _newRecipients,
        uint256[] memory _maxCaps
    ) internal {
        uint256 newRecipientsLength = _newRecipients.length;

        if (newRecipientsLength != _maxCaps.length) {
            revert InconsistentDataLengthError();
        }

        _removeAll();
        totalAmount = 0;

        for (uint256 i = 0; i < newRecipientsLength; ) {
            _addRecipient(_newRecipients[i], _maxCaps[i]);
            totalAmount += _maxCaps[i];
            unchecked {
                i++;
            }
        }

        emit SetRecipients(_newRecipients, _maxCaps);
    }

    /**
     * @notice function for removing all recipients
     */
    function _removeAll() internal {
        uint256 recipientsLength = recipients.length;

        if (recipientsLength == 0) {
            return;
        }

        for (uint256 i = 0; i < recipientsLength; ) {
            address recipient = recipients[i];
            delete recieveAmount[recipient];
            unchecked {
                i++;
            }
        }
        delete recipients;
    }

    function _redistributeNativeToken(
        uint256 balance
    ) internal {
        uint256 recipientsLength = recipients.length;
        if (recipientsLength == 0) {
            return;
        }
        if (balance < totalAmount) {
            return;
        }
        // if any, subtract platform Fee and send it to platformWallet
        if (platformFee > 0) {
            uint256 fee = totalAmount * platformFee / 10000000;
            if (balance < totalAmount + fee) {
                return;
            }
            address payable platformWallet = factory.platformWallet();
            (bool feeSuccess, ) = platformWallet.call{ value: fee }("");
            if (feeSuccess == false) {
                revert TransferFailedError();
            }
        }

        for (uint i = 0; i < recipientsLength;) {
            address currentRecipient = recipients[i];
            uint256 tokenValueToSent = recieveAmount[currentRecipient];

            (bool success, ) = payable(currentRecipient).call{
                value: tokenValueToSent
            }("");
            if (success == false) {
                revert TransferFailedError();
            }
            unchecked {
                i++;
            }
        }

        emit DistributeNativeToken(totalAmount);
    }

    /**
     * @notice Internal function to redistribute ERC20 token based waterfall rules
     */
    function _redistributeToken() internal {
        uint256 recipientsLength = recipients.length;
        if (recipientsLength == 0) {
            return;
        }

        IERC20 erc20Token = IERC20(supportedToken);

        uint256 balance = erc20Token.balanceOf(address(this));
        if (balance < totalAmount) {
            // Nothing to distribute
            return;
        }

        // if any subtract platform Fee and send it to platformWallet
        if (platformFee > 0) {
            uint256 fee = totalAmount * platformFee / 10000000;

            if (balance < totalAmount + fee) {
                return;
            }
            
            address payable platformWallet = factory.platformWallet();
            erc20Token.safeTransfer(platformWallet, fee);            
        }

        for (uint i = 0; i < recipientsLength;) {
            address currentRecipient = recipients[i];
            uint256 tokenValueToSent = recieveAmount[currentRecipient];

            erc20Token.safeTransfer(currentRecipient, tokenValueToSent);
            unchecked {
                i++;
            }
        }

        emit DistributeToken(supportedToken, totalAmount);
    }

    receive() external payable {}
}   