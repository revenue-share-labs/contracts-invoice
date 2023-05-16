# Contracts Invoice

# Invoice contracts repository

Detailed documentation for each contract can be found [here](./docs/contracts/).

Deployment instructions described in [Deployment.md](./scripts/Deployment.md)

## Summary

1. The main ideas of Invoice SC is to redistribute tokens (either ERC-20 or native cryptocurrency), to the participants based on the amount assigned to them.
2. Every native cryptocurrency sent to this contract address will be redistributed manually using the redistributeNativeToken() method.
3. Every ERC-20 token must be manually redistributed using the redistributeToken() method.
4. The contract must always redistribute 100% of the total amount between recipients.
5. The distribution of native cryptocurrency and ERC-20 tokens can only be done by the one of the distributors. Distributors can be added or removed by the owner.
6. The recipients can only be changed by the controller and only if `isImmutableRecipients = false` Controller can be changed by the owner of the Invoice contract. Owner of the contract can set `isImmutableRecipients` on contract creation. If upon initialisation `isImmutableRecipients` is false, then at some point the owner can “lock recipients“ - make them immutable - by setting `isImmutableRecipients = true;`
7. If `isImmutableRecipients = true`, then: recipients can NOT be changed and `isImmutableRecipients` CAN’T be set to false.
8. Controller can be changed only by the owner of the Invoice contract.

## Actors and use cases

- owner → Address that has the capability to set the distributor / controller and set immutable recipients;
- recipients → Addresses which will receive redistributed currency or ERC-20 tokens according to their amount;
- distributors → Addresses which can distribute native currency or ERC-20 tokens locked in contract;
- controller → Address which can set recipients;
- factory → Address of the factory that was used for contract creation. It is used for getting platformWallet which receives Fee from contract usage;

## Functions

### Read functions

| Function                                    |                                                                       Description                                                                     |
|---------------------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------:|
| controller() -> address                     |                                                 This function returns the controller’s wallet address.                                                |
| distributors(address distributor) -> bool   |                This function (mapping) helps to identify if the address provided to this function is a distributor or not (true/false).               |
| factory() -> address                        |                                               This function returns the address of the factory contract.                                              |
| numberOfRecipients()                        |                                                      Returns number of recipients in the contract.                                                    |
| owner() -> address                          |                                                           Returns the owner of the contract.                                                          |
| platformFee() -> uint256                    |                   This function returns the platform fee in integers. PlatformFee cannot be more than 10000000, which represents 100%                 |
| recipients(uint256 number) -> address       |          Accepts ordinal numbers starting from zero and returns recipient address (which is saved in the array in specified number as a key).         |
| receiveAmount(address recipient) -> uint256 |                                      address → number representing amount that the specified address will receive                                     |
| supportedToken() -> address                 |                     Address of the token to be distributed. If a zero address is specified, the native currency will be distributed                   |
| isImmutableRecipients() -> bool             |                                                       If true, `recipients` array cant be updated                                                     |
| totalAmount() -> uint256                    |                                          Total amount of tokens that will be distributed among all recipients                                         |
| isNativeDistribution() -> bool              |                                                      If true, native currency will be distributed                                                     |

### Write functions

| Function                                                  |                                                                                                                Description                                                                                                                 |
|-----------------------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| initialize                                                |                                                                                     Initialises smart contract with initial settings. See Constructor                                                                                      |
| redistributeNativeToken()                                 |                            Allows to manually distribute native tokens in the contract to participants based on their amount (can be called only if balance of the contract is greater than the total amount).                             |
| redistributeToken()                                       |                               Allows to manually distribute ERC20 token in the contract to participants based on their amount (can be called only if balance of the contract greater than the total amount).                               |
| setController(address _controller)                        |                This function allows setting a new controller address. If the address is set to address(0), the contract becomes immutable. If contract have immutableController, you cannot change the controller address.                 |
| setDistributor(address _distributor, bool _isDistributor) |        Enables setting of distributor status to either true or false. A value of true indicates that the address holds the distributor role, while a value of false indicates that the address no longer has the distributor role.         |
| setRecipients(tuple[] _recipientsData)                    |                                                                                                This function enables to change recipients.                                                                                                 |
| transferOwnership(address newOwner) -> bool               |                                                                                      Transfers ownership of the contract to a new account (newOwner).                                                                                      |
| receive()                                                 |                                                                               Allows the contract to receive native currency in order to distribute it later                                                                               |
| lockRecipients()                                          |                                                                       Set isImmutableRecipients to true. A value of true indicates that recipients can't be changed                                                                        |
