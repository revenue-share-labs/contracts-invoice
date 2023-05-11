// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "contracts/Invoice.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Throw when Fee Percentage is more than 100%
error InvalidFeePercentage(uint256);

/// @title Invoice factory contract.
/// @notice Used to deploy Invoice contracts
contract InvoiceFactory is Ownable {
    /// Invoice implementation address
    address payable public immutable contractImplementation;

    /// InvoiceFactory contract version
    uint256 constant version = 1;
    
    /// Current platfrom fee
    uint256 public platformFee;

    /// Fee receiver address
    address payable public platformWallet;

    /// Invoice creationd data struct
    struct InvoiceCreateData {
        /// Address of the controller (sets recipients)
        address controller;
        /// Addresses of the distributors
        address[] distributors;
        /// Whether the recipients are modifiable or not
        bool isImmutableRecipients;
        /// Initial array of recipients addresses
        Invoice.RecipientData[] recipientsData;
        /// Address of the token to be distributed
        address token;
        /// Creation id
        bytes32 creationId;
    }

    /// Emmitted when Invoice is deployed
    event InvoiceCreated(
        address invoice,
        address controller,
        address[] distributors,
        uint256 version,
        bool isImmutableRecipients,
        address token
    );

    /// Emitted when a platform fee is set
    event PlatformFeeChanged(uint256 newFee);

    /// Emitted when a platform wallet is set   
    event PlatformWalletChanged(address payable newPlatformWallet);

    /** @notice Creates Invoice contract.
     * @dev Deploys current Invoice implementation contract
     * and sets its address to `contractImplementation`.
     */
    constructor() {
        contractImplementation = payable(address(new Invoice()));
    }

    /**
     * @dev Public function for creating clone proxy pointing to Invoice
     * @param _data Initial data for creating new Invoice contract
     * @return Address of new contract
     */
    function createInvoice(InvoiceCreateData memory _data) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        address payable clone;
        if (creationId != bytes32(0)) {
            bytes32 salt = _getSalt(_data, msg.sender);
            clone = payable(
                Clones.cloneDeterministic(contractImplementation, salt)
            );
        } else {
            clone = payable(Clones.clone(contractImplementation));
        }

        Invoice.InitContractSetting memory contractSettings = Invoice.InitContractSetting(
            msg.sender,
            _data.controller,
            _data.distributors,
            _data.isImmutableRecipients,
            _data.recipientsData,
            _data.token,
            platformFee
        );

        Invoice(clone).initialize(
            contractSettings
        );

        emit InvoiceCreated(
            clone,
            _data.controller,
            _data.distributors,
            version,
            _data.isImmutableRecipients,
            _data.token
        );

        return clone;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _fee Percentage define platform fee 100% == 10000000
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        if (_fee > 10000000) {
            revert InvalidFeePercentage(_fee);
        }
        emit PlatformFeeChanged(_fee);
        platformFee = _fee;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _platformWallet New native token wallet which will receive fees
     */
    function setPlatformWallet(address payable _platformWallet) external onlyOwner {
        emit PlatformWalletChanged(_platformWallet);
        platformWallet = _platformWallet;
    }

    /**
     * @dev Internal function for getting semi-random salt for deterministicClone creation.
     * @param _data Invoice create data used for hashing and getting random salt.
     * @param _deployer Wallet address that want to create new RSC contract.
     */
    function _getSalt(
        InvoiceCreateData memory _data,
        address _deployer
    ) internal pure returns (bytes32) {
        bytes32 hash = keccak256(
            abi.encode(
                _data.controller,
                _data.distributors,
                _data.isImmutableRecipients,
                _data.recipientsData,
                _data.creationId,
                _deployer
            )
        );
        return hash;
    }
}
