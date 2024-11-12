const standbyAccountField = document.getElementById("standbyAccountField");
const standbyPubKeyField = document.getElementById("standbyPubKeyField");
const standbyPrivKeyField = document.getElementById("standbyPrivKeyField");
const standbySeedField = document.getElementById("standbySeedField");
const standbyBalanceField = document.getElementById("standbyBalanceField");
const standbyResultField = document.getElementById("standbyResultField");

let userSeed = "sEd7YNNNgEDMbrgjKsPsnR1YgxzcNfK";

async function getAccount(type) {

  // connects new xrpl client to TestNet
  let net = "wss://s.altnet.rippletest.net:51233";
  const client = new xrpl.Client(net)
  results = "Connecting to " + net + "...<br/>"

  // use default faucet for TestNet to connect
  let faucetHost = null;
  let amount = '930';
  if (type == "standby") {
    standbyResultField.innerHTML = results;
  } 
  await client.connect();

  results += "\nConnected, funding wallet.<br/>";
  if (type == "standby") {
    standbyResultField.innerHTML = results;
  } 

  // fund new wallet with pre-specified amt and null faucetHost
  const my_wallet = (await client.fundWallet(null, {amount, faucetHost})).wallet;

  results += "\nGot a wallet.<br/>";
  if (type == "standby") {
    standbyResultField.innerHTML = results;
  } 

  userSeed = my_wallet.seed;

  // get current balance in wallet
  const my_balance = await client.getXrpBalance(my_wallet.address);

  if (type == "standby") {
    standbyAccountField.innerHTML = my_wallet.address;
    standbyPubKeyField.innerHTML = my_wallet.publicKey;
    standbyPrivKeyField.innerHTML = my_wallet.privateKey;
    standbyBalanceField.innerHTML = my_balance;
    standbySeedField.innerHTML = my_wallet.seed;

    results += "\nStandby account created.<br/>";
    standbyResultField.innerHTML = results;
  }

  client.disconnect();
}

async function makeBuyOffer() {
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  await client.connect();

  const nftTokenID = document.getElementById("standbyTokenIDField").value;
  const offerAmountXRP = parseFloat(document.getElementById("standbyAmountField").value);

  // Load buyer's account using their seed
  const buyerWallet = xrpl.Wallet.fromSeed(userSeed);
  console.log("User Seed:", userSeed);

  // Ensure account balance is sufficient
  const buyerBalance = await client.getXrpBalance(buyerWallet.address);
  console.log("Buyer Balance:", buyerBalance);

  if (parseFloat(buyerBalance) < parseFloat(offerAmountXRP) + 0.0002) { // Adjust for transaction fee
    console.error("Insufficient balance to create buy offer.");
    await client.disconnect();
    return;
  }

  // Convert offer amount to drops (1 XRP = 1,000,000 drops)
  const offerAmountDrops = (offerAmountXRP * 1000000).toString();

  // Validate NFT Token ID and offer amount
  if (!nftTokenID || typeof nftTokenID !== "string") {
    console.error("Invalid NFT Token ID:", nftTokenID);
    await client.disconnect();
    return;
  }
  if (!offerAmountDrops || typeof offerAmountDrops !== "string") {
    console.error("Invalid offer amount");
    await client.disconnect();
    return;
  }

  // Log the Token ID and Amount for debugging
  console.log("NFT Token ID:", nftTokenID);
  console.log("Offer Amount (in drops):", offerAmountDrops);

  const currentLedgerIndex = await client.getLedgerIndex();
  console.log("Current Ledger Index:", currentLedgerIndex);

  const artistAccountAddress = "rscuBEBSatjBvnRDWg2Cx1Y42mHSs7wZZ9"; // Replace with the actual artist's account address

  // Verify that the NFT exists on the ledger
  const nftExists = await verifyNFTExists(client, artistAccountAddress, nftTokenID);

  if (!nftExists) {
      console.error("Cannot create a buy offer because the NFT does not exist on the ledger.");
      await client.disconnect();
      return;
  }

  // Create a buy offer for the specified NFT
  const buyOfferTx = {
    TransactionType: "NFTokenCreateOffer",
    Account: buyerWallet.classicAddress,
    NFTokenID: nftTokenID,
    Amount: offerAmountDrops
  };

  console.log("NFT Token ID:", nftTokenID);
  console.log("Buyer Account:", buyerWallet.classicAddress);
  console.log("Offer Amount in Drops:", offerAmountDrops);

  try {
    const submitResponse = await client.submit(buyOfferTx, { wallet: buyerWallet });
    console.log("Submitted transaction:", submitResponse);
    // Polling for the status here if needed
  } catch (error) {
      console.error("Error submitting buy offer:", error);
  }


  // console.log("Prepared Buy Offer Transaction:", buyOfferTx);

  // try {
  //   const buyOfferResponse = await client.submitAndWait(buyOfferTx, { wallet: buyerWallet });
  //   console.log("Transaction submitted:", buyOfferResponse);

  //   // Check if the transaction is validated and on the ledger
  //   const txHash = buyOfferResponse.result.tx_json.hash;
  //   console.log("Transaction Hash:", txHash);

  //   // Polling for the transaction status
  //   let validated = false;
  //   let attempts = 0;
  //   const maxAttempts = 10;

  //   while (!validated && attempts < maxAttempts) {
  //     attempts++;
  //     console.log(`Checking transaction status, attempt ${attempts}...`);
  //     const txResponse = await client.request({
  //       command: "tx",
  //       transaction: txHash
  //     });

  //     if (txResponse.result && txResponse.result.validated) {
  //       validated = true;
  //       console.log("Transaction has been validated and is on the ledger:", txResponse);
  //     } else {
  //       await new Promise(resolve => setTimeout(resolve, 2000));
  //     }
  //   }

  //   if (!validated) {
  //     console.warn("Transaction was not validated within the expected time.");
  //   }

  // } catch (error) {
  //   console.error("Error submitting buy offer:", error);
  // }

  await client.disconnect();
}

async function verifyNFTExists(client, account, nftTokenID) {
  try {
      const nftResponse = await client.request({
          method: "account_nfts",
          account: account
      });

      console.log("NFTs owned by account:", nftResponse);

      const nftExists = nftResponse.result.account_nfts.some(nft => nft.NFTokenID === nftTokenID);

      if (nftExists) {
          console.log(`NFT with Token ID ${nftTokenID} exists on the ledger.`);
          return true;
      } else {
          console.error(`NFT with Token ID ${nftTokenID} does not exist on the ledger.`);
          return false;
      }

  } catch (error) {
      console.error("Error fetching NFTs for account:", error);
      return false;
  }
}

async function loadArtistAccount() {

  // connects new xrpl client to TestNet
  let net = "wss://s.altnet.rippletest.net:51233";
  const client = new xrpl.Client(net)
  results = "Connecting to " + net + "...<br/>"
  await client.connect();

  // Load acc w/ seed 'sEdTrJt9iNA3MgLemD1woPxSHssTkEX'
  const my_wallet = xrpl.Wallet.fromSeed("sEdSzXgmNxGuzHcFZTnqTAxPMzBWZRH");
  const my_balance = await client.getXrpBalance(my_wallet.address);
  console.log("wallet balance:", my_balance);

  console.log("Minting NFToken");

  const uri = 'Concert Ticket Seat B';

  // mint an NFT
  const mint_tx = {
    TransactionType: "NFTokenMint",
    Account: my_wallet.classicAddress,
    URI: xrpl.convertStringToHex(uri),
    Flags: 8,
    TransferFee: 2,
    NFTokenTaxon: 0
  };

  console.log("artist address:", my_wallet.classicAddress);

  const mint_response = await client.submitAndWait(mint_tx, { wallet: my_wallet });
  console.log("NFT minted:", mint_response);

  // retrieve token id of newly minted NFT
  const nft_response = await client.request({
    method: "account_nfts",
    account: my_wallet.classicAddress
  });

  // Locate the NFT with the matching unique URI
  const minted_nft = nft_response.result.account_nfts.find(nft => 
    xrpl.convertHexToString(nft.URI) === uri
  );
  
  if (minted_nft) {
    console.log("Minted NFT Token ID:", minted_nft.NFTokenID);
  } else {
    console.log("NFT not found.");
  }

  const sell_offer_tx = {
    TransactionType: "NFTokenCreateOffer",
    Account: my_wallet.classicAddress,
    NFTokenID: minted_nft.NFTokenID,
    Amount: "15000000",
    Flags: 1 // Flag to indicate it's a sell offer
  }

  const sellOfferResponse = await client.submitAndWait(sell_offer_tx, { wallet: my_wallet });
  console.log(`Created sell offer for NFT: ${uri} with Token ID: ${minted_nft.NFTokenID}`, sellOfferResponse);

  // if (nft_response.result.account_nfts.length > 0) {

  //   const nft_list = nft_response.result.account_nfts;

  //   for (let i=0; i<nft_list.length; i++) {
  //     const nft = nft_response.result.account_nfts[i];

  //     // Decode the URI from hex to a readable string, or set to "No URI" if not available
  //     const nftName = nft.URI ? xrpl.convertHexToString(nft.URI) : "No URI";

  //     // Log the NFT name 
  //     console.log(`NFT ${i + 1} Name:`, nftName);
  //   }
  // } else {
  //   console.log("No NFTs found for this account.");
  // }
  client.disconnect();
}

loadArtistAccount();





// async function sendXRP() {
//   results = "Connecting to the selected ledger.<br/>";
//   standbyResultField.innerHTML = results;

//   let net = "wss://s.altnet.rippletest.net:51233";
//   const client = new xrpl.Client(net);
//   await client.connect();

//   results += "\nConnected. Sending XRP.<br/>";
//   standbyResultField.innerHTML = results;

//   const standby_wallet = xrpl.Wallet.fromSeed(standbySeedField.innerHTML);



// }