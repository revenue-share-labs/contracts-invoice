pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeFactory.sol";

/// Throw when if sender is not distributor
error OnlyDistributorError();

/// Throw when sender is not controller
error OnlyControllerError();

/// Throw when transaction fails
error TransferFailedError();

/// Throw when submitted recipient with address(0)
error NullAddressRecipientError();

/// Throw when distributor address is same as submit one
error ControllerAlreadyConfiguredError();

/// Throw when change is triggered for immutable controller
error ImmutableControllerError();

/// Throw if recipient is already in the recipients pool
error RecipientAlreadyAddedError();

/// Throw when change is triggered for immutable recipients
error ImmutableRecipientsError();

/// @title Invoice contract.
/// @notice The main function of Invoice is to redistribute token
/// (either ERC-20 or native token), to the participants
/// based on the fixed amount assigned to them.
contract Invoice is OwnableUpgradeable{
    using SafeERC20 for IERC20;
    
    /// distributorAddress => isDistributor
    mapping(address => bool) public distributors;
    
    /// Controller address
    address public controller;
    
    /// Factory address
    IFeeFactory public factory;
    
    /// Address of the token to be distributed
    address public supportedToken;

    /// If true, `recipients` array cant be updated
    bool public isImmutableRecipients;

    /// Platform fee percentage
    uint256 public platformFee;

    /// Total amount of the distribution
    uint256 public totalAmount;

    /// If true, native currency will be distributed
    bool isNativeDistribution;

    /// recipientAddress => receiveAmount
    mapping(address => uint256) public receiveAmount;
    
    /// Array of the recipients
    address payable[] public recipients;

    /// Initial contract settings
    struct InitContractSetting {
        /// Owner of the contract
        address owner;
        /// Address which sets recipients
        address controller;
        /// List of addresses which can distribute either ERC20 tokens or native currency
        address[] distributors;
        /// Flag indicating whether recipients could be changed
        bool isImmutableRecipients;
        /// Array of `RecipientData` structs with recipient address and amount to receive
        RecipientData[] recipientsData;
        /// Address of the token to be distributed
        address token;
        /// Percentage defining fee for distribution services
        uint256 platformFee;
    }

    /// Contains recipient address and their amount to receive
    struct RecipientData {
        address payable recipient;
        uint256 amount;
    }
 
    /// Emmited when recipients and their percentages are set
    event SetRecipients(RecipientData[] recipientsData);

    /// Emitted when token distribution is triggered
    event DistributeToken(address token, uint256 amount);

    /// Emmitted when native currency is triggered
    event DistributeNativeToken(uint256 amount);

    /// Emmitted when distributors are set
    event DistributorChanged(address distributor, bool isDistributor);

    /// Emitted when new controller address is set
    event ControllerChanged(address oldController, address newController);

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

    /**
     * @dev Throws if recipients can't be changed
     */
    modifier onlyImmutableRecipients() {
        if (isImmutableRecipients) {
            revert ImmutableRecipientsError();
        }
        _;
    }

    /**
     * @dev Constructor function, can be called only once
     * @param _settings Initial data for contract setup
     */
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

        factory = IFeeFactory(msg.sender);
        _transferOwnership(_settings.owner);

        if (_settings.token == address(0)) {
            isNativeDistribution = true;
        } else {
            supportedToken = _settings.token;
        }
        
        // Recipients settings
        _setRecipients(_settings.recipientsData);
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
     * @param recipientsData Array of struct that contains data about recipients
     */
    function setRecipients(
        RecipientData[] memory recipientsData
    ) public onlyController onlyImmutableRecipients {
        _setRecipients(recipientsData);
    }

    /**
     * @dev External function for setting immutable recipients to true
     */
    function lockRecipients() external onlyOwner onlyImmutableRecipients {
        isImmutableRecipients = true;
    }

    /**
     * @notice External function to redistribute native token
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
     * @notice External function to redistribute ERC20 token
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
     * @param _maxCap max cap of new recipient
     */
    function _addRecipient(
        address payable _recipient,
        uint256 _maxCap
    ) internal {
        if (_recipient == address(0)) {
            revert NullAddressRecipientError();
        } else if (receiveAmount[_recipient] > 0) {
            revert RecipientAlreadyAddedError();
        }

        recipients.push(_recipient);
        receiveAmount[_recipient] = _maxCap;
    }

    /**
     * @notice Internal function for setting recipients
     * @param recipientsData Array of struct that contains data about recipients
     */
    function _setRecipients(
        RecipientData[] memory recipientsData
    ) internal {
        uint256 newRecipientsLength = recipientsData.length;

        _removeAll();
        totalAmount = 0;

        for (uint256 i = 0; i < newRecipientsLength; ) {
            _addRecipient(recipientsData[i].recipient, recipientsData[i].amount);
            totalAmount += recipientsData[i].amount;
            unchecked {
                i++;
            }
        }

        emit SetRecipients(recipientsData);
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
            delete receiveAmount[recipient];
            unchecked {
                i++;
            }
        }
        delete recipients;
    }

    /**
     * @dev Internal function to redistribute native currency
     * @param balance Native currency amount to be distributed
     */
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
            if (!feeSuccess) {
                revert TransferFailedError();
            }
        }

        for (uint i = 0; i < recipientsLength;) {
            address currentRecipient = recipients[i];
            uint256 tokenValueToSent = receiveAmount[currentRecipient];

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
     * @notice Internal function to redistribute ERC20 token
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
            uint256 tokenValueToSent = receiveAmount[currentRecipient];

            erc20Token.safeTransfer(currentRecipient, tokenValueToSent);
            unchecked {
                i++;
            }
        }

        emit DistributeToken(supportedToken, totalAmount);
    }

    receive() external payable {}
}   