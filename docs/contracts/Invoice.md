# Invoice

## Contract Description


License: BSL 1.1


The main function of Invoice is to redistribute token (either ERC-20 or native token), to the participants based on the fixed amount assigned to them.

## Events info

### ControllerChanged event

```solidity
event ControllerChanged(address newController);
```


Emitted when new controller address is set.

### DistributeToken event

```solidity
event DistributeToken(address token, uint256 amount);
```


Emitted when token distribution is triggered.

### DistributorChanged event

```solidity
event DistributorChanged(address distributor, bool isDistributor);
```


Emmitted when distributors are set.

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### SetRecipients event

```solidity
event SetRecipients(tuple[] recipients);
```


Emmited when recipients and their amount to receive are set.

## Errors info

### ImmutableRecipientsError error

```solidity
error ImmutableRecipientsError();
```


Throw when change is triggered for immutable recipients

### NullAddressRecipientError error

```solidity
error NullAddressRecipientError();
```


Throw when submitted recipient with address(0)

### OnlyControllerError error

```solidity
error OnlyControllerError();
```


Throw when sender is not controller

### OnlyDistributorError error

```solidity
error OnlyDistributorError();
```


Throw when if sender is not distributor

### RecipientAlreadyAddedError error

```solidity
error RecipientAlreadyAddedError();
```


Throw if recipient is already in contract

### TransferFailedError error

```solidity
error TransferFailedError();
```


Throw when transaction fails

## Functions info

### controller (0xf77c4791)

```solidity
function controller() external view returns (address);
```


Controller address

### distributors (0xcc642784)

```solidity
function distributors(address) external view returns (bool);
```


distributorAddress => isDistributor

### factory (0xc45a0155)

```solidity
function factory() external view returns (address);
```


Factory address.

### supportedToken (0x0ee0599c)

```solidity
function supportedToken() external view returns (address);
```

Address of the token to be distributed

### isImmutableRecipients (0xeaf4598a)

```solidity
function isImmutableRecipients() external view returns (bool);
```


If true, `recipients` array cant be updated.

### platformFee (0x26232a2e)

```solidity
function platformFee() external view returns (uint256);
```


Platform fee percentage.

### totalAmount (0x1a39d8ef)

```solidity 
function totalAmount() external view returns (uint256);
```

Total amount of the distribution

### isNativeDistribution (0xeec8d0e4)

```solidity
function isNativeDistribution() external view returns (bool);
```

If true, native currency will be distributed

### receiveAmount (0xb9b9c21e)

```solidity 
function receiveAmount(address) extenal view returns (uint256);
```

recipientAddress => receiveAmount

### recipients (0xd1bc76a1)

```solidity
function recipients(uint256) external view returns (address);
```

Array of the recipients

### initialize (0xe1a97a47)

```solidity
function initialize(tuple _settings) external;
```


Constructor function, can be called only once.


Parameters:

| Name                              | Type      | Description                                                                            |
| :-------------------------------- | :-------- | :------------------------------------------------------------------------------------- |
| _settings                         | tuple     | Contract settings. Check InitContractSetting struct                                    |

### numberOfRecipients (0xee0e01c7)

```solidity
function numberOfRecipients() external view returns (uint256);
```


External function to return number of recipients.

### owner (0x8da5cb5b)

```solidity
function owner() external view returns (address);
```


Returns the address of the current owner.

### redistributeNativeToken (0x6194e63c)

```solidity
function redistributeNativeCurrency() external;
```


External function to redistribute native token.

### redistributeToken (0xaa872895)

```solidity
function redistributeToken() external;
```


External function to redistribute ERC20 token.

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external view;
```


Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership is forbidden for RSC contract.

### setController (0x92eefe9b)

```solidity
function setController(address _controller) external;
```


External function to set controller address, if set to address(0), unable to change it


Parameters:

| Name        | Type    | Description                |
| :---------- | :------ | :------------------------- |
| _controller | address | Address of new controller. |

### setDistributor (0xd59ba0df)

```solidity
function setDistributor(address _distributor, bool _isDistributor) external;
```


External function to set distributor address.


Parameters:

| Name           | Type    | Description                                             |
| :------------- | :------ | :------------------------------------------------------ |
| _distributor   | address | Address of new distributor.                             |
| _isDistributor | bool    | Bool indicating whether address is / isn't distributor. |

### lockRecipients (0xaef2151b)

```solidity
function lockRecipients() external;
```


External function for setting immutable recipients to true.

### setRecipients (0x84890ba3)

```solidity
function setRecipients(tuple[] _recipientsData) external;
```


External function for setting recipients.


Parameters:

| Name        | Type    | Description                                                             |
| :---------- | :------ | :---------------------------------------------------------------------- |
| _recipients | tuple[] | Array of `RecipientData` structs with data about recipients.            |

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```


Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.