# HashCast

Hashcast is like Twitter for computers. You can CAST (broadcast) many different types 
of messages, ranging from simple strings ('Hello world!') to cryptographic payloads, such as 
Varna bids and atomic swap signatures. You can scan Plasma for these broadcasts, and if you 
find something interesting, most hashes resolve to files that you can PULL (download).

Hashcast allows all of us on Plasma to connect, trade, store stuff, 
communicate, and exchange data. The latter capability is the starting 
point for inter-process communication and synchronization, which is 
needed for things like atomic swaps.

*NOTE* Hashcast is primarily intended to help synchronize transactions, e.g. atomic swaps, 
but we are releasing this simple UI to allow people to interact with the system, and 
use it. 

## Interesting/notable features of the code

* Web3.js updated to 1.3.4
* Added the Metamask Legacy support for injection
* Patch js-childchain to accommodate Web3.js 1.3.4
* Demonstrate the use of UFOs "UnFinalized transaction Outputs" to quickly fire transactions from a client, based on rapid Child Chain returns of the output UTXOs (blocknumber and txindex) _before_ the transaction has been finalized. Although supported for a while, this feature has not been widely known/used. With the UFO approach, a more snappy user experience can be achieved, among other benefits. However, the client is then responsible for basic UTXO management (at least briefly). 

## Initial Setup

1. `yarn install`

2. Make sure you are using a current version of Node

3. Create a `.env` file with the following contents in the root and add your configuration.

```env
REACT_APP_SYNC_INTERVAL=120 //max number of blocks that watcher has to sync to the child chain before allowing further transactions
REACT_APP_POLL_INTERVAL=20 //number of seconds to poll account data
```

4. `yarn start`

5. Open your browser and navigate to `http://localhost:3000`. A refreshed `web-wallet` and a simple `Hashcast` UI will be available. 

## Patching

To patch npm-delivered files, simply, for example:

```
yarn patch-package @omisego/omg-js-childchain
```
