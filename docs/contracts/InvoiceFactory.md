# InvoiceFactory

## Contract Description


License: BSL 1.1


Used to deploy Invoice contracts.

## Events info

### InvoiceCreated event

```solidity
event InvoiceCreated(
    address invoice,
    address controller,
    address[] distributors,
    uint256 version,
    bool isImmutableRecipients,
    address token
);
```


Emmitted when Invoice is deployed.

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### PlatformFeeChanged event

```solidity
event PlatformFeeChanged(uint256 newFee);
```


Emitted when a platform fee is set.

### PlatformWalletChanged event

```solidity
event PlatformWalletChanged(address newPlatformWallet);
```


Emitted when a platform wallet is set.

## Errors info

### InvalidFeePercentage error

```solidity
error InvalidFeePercentage(uint256);
```


Throw when Fee Percentage is more than 100%.

## Functions info

### version (0x54fd4d50)

```solidity
function version() external view returns (uint256);
```


RSCValveFactory contract version.

### contractImplementation (0x9e72370b)

```solidity
function contractImplementation() external view returns (address);
```


Invoice implementation address.

### createInvoice (0x47472f4b)

```solidity
function createInvoice(tuple _data) external returns (address);
```


Public function for creating clone proxy pointing to Invoice.


Parameters:

| Name  | Type  | Description                                       |
| :---- | :---- | :------------------------------------------------ |
| _data | tuple | Initial data for creating new Invoice contract.   |

### owner (0x8da5cb5b)

```solidity
function owner() external view returns (address);
```


Returns the address of the current owner.

### platformFee (0x26232a2e)

```solidity
function platformFee() external view returns (uint256);
```


Current platform fee.

### platformWallet (0xfa2af9da)

```solidity
function platformWallet() external view returns (address);
```


Fee receiver address.

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external;
```


Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.

### setPlatformFee (0x12e8e2c3)

```solidity
function setPlatformFee(uint256 _fee) external;
```


Only Owner function for setting platform fee.


Parameters:

| Name | Type    | Description                                         |
| :--- | :------ | :-------------------------------------------------- |
| _fee | uint256 | Percentage define platform fee 100% == 10000000.    |

### setPlatformWallet (0x8831e9cf)

```solidity
function setPlatformWallet(address _platformWallet) external;
```


Owner function for setting platform fee.


Parameters:

| Name            | Type    | Description                                        |
| :-------------- | :------ | :------------------------------------------------- |
| _platformWallet | address | New native currency wallet which will receive fee. |

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```


Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.