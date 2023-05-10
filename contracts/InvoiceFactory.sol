// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "contracts/Invoice.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Throw when Fee Percentage is more than 100%
error InvalidFeePercentage();

// Throw when creationId was already created
error CreationIdAlreadyProcessed();

contract InvoiceFactory is Ownable {
    address payable public immutable contractImplementation;

    uint256 constant version = 1;
    uint256 public platformFee;
    address payable public platformWallet;

    // creationId unique ID for each contract creation TX, it prevents users to submit tx twice
    mapping(bytes32 => bool) public processedCreationIds;

    struct RSCCreateData {
        address controller;
        address[] distributors;
        bool isImmutableRecipients;
        address payable [] initialRecipients;
        address token;
        uint256[] amounts;
        bytes32 creationId;
    }

    event InvoiceCreated(
        address invoice,
        address controller,
        address[] distributors,
        uint256 version,
        bool isImmutableRecipients,
        address token,
        bytes32 creationId
    );

    event PlatformFeeChanged(uint256 oldFee, uint256 newFee);

    event PlatformWalletChanged(
        address payable oldPlatformWallet,
        address payable newPlatformWallet
    );

    constructor() {
        contractImplementation = payable(address(new Invoice()));
    }

    /**
     * @dev Public function for creating clone proxy pointing to RSC Waterfall
     * @param _data Initial data for creating new RSC Waterfall native token contract
     * @return Address of new contract
     */
    function createInvoice(RSCCreateData memory _data) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        if (creationId != bytes32(0)) {
            bool processed = processedCreationIds[creationId];
            if (processed) {
                revert CreationIdAlreadyProcessed();
            } else {
                processedCreationIds[creationId] = true;
            }
        }

        address payable clone = payable(Clones.clone(contractImplementation));

        Invoice.InitContractSetting memory contractSettings = Invoice.InitContractSetting(
            msg.sender,
            _data.controller,
            _data.distributors,
            _data.isImmutableRecipients,
            _data.initialRecipients,
            _data.token,
            _data.amounts,
            platformFee,
            address(this)
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
            _data.token,
            creationId
        );

        return clone;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _fee Percentage define platform fee 100% == 10000000
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        if (_fee > 10000000) {
            revert InvalidFeePercentage();
        }
        emit PlatformFeeChanged(platformFee, _fee);
        platformFee = _fee;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _platformWallet New native token wallet which will receive fees
     */
    function setPlatformWallet(address payable _platformWallet) external onlyOwner {
        emit PlatformWalletChanged(platformWallet, _platformWallet);
        platformWallet = _platformWallet;
    }
}
