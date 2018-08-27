pragma solidity ^0.4.11;

// 請使用solc 0.4.20編譯，否則會有問題
contract Owned {
  address owner;

  function Owned() {
    owner = msg.sender;
  }

  modifier onlyOwner() {
    if(msg.sender!=owner) throw; _;
  }

}

// 存放清算銀行客戶的在債券數量，以便於使用清算銀行及客戶帳號為key來查詢
// 注意Owner為TransactionMatcher contract
contract Bank_Account is Owned {

  bytes32 bank_id;
  uint customers_cnt;

  bool private isOwnedNode = false;  // 使用private transaction來設定flag，
                                     // 每個Bank_Account Contract只有在自己跟央行才會設flag
                                     // 以便判斷是在那個節點上跑

  struct customer {
      bytes32 [] ids;
      mapping(bytes32 => securities_account) securities_accounts; // 以id為index
      mapping(bytes32 => bool) hasCustomer;
  }

  struct securities_account {
      bytes32 [] securities;  // 債券清單
      uint securities_cnt;
      mapping(bytes32 => int) total_amounts;   // 總數量     以債券代號為index
      mapping(bytes32 => int) position_amounts; // 持有部位  以債券代號為index
      mapping(bytes32 => bool) hasSecurities;
  }

  customer private customers;

  function Bank_Account(bytes32 _bank_id) {
     bank_id = _bank_id;
  }

  function setOwnedNode(bool _is_true) onlyOwner {
     isOwnedNode = _is_true;
  }

  function checkOwnedNode() constant returns(bool) {
     return isOwnedNode;
  }


  // 設定客戶擁有債券數量，注意，清算銀行自己本身也有帳號 客戶持有部位也要增加
  function setCustomerOwnedSecuritiesAmount(bytes32 _customer_id, bytes32 _securities_id, int _amount_total, bool _is_increase) onlyOwner {

     if(!customers.hasCustomer[_customer_id]) {
         customers.ids.push(_customer_id);
         customers_cnt++;
         customers.hasCustomer[_customer_id] = true;
     }

     if(!customers.securities_accounts[_customer_id].hasSecurities[_securities_id]) {
         customers.securities_accounts[_customer_id].securities.push(_securities_id);
         customers.securities_accounts[_customer_id].securities_cnt++;
         customers.securities_accounts[_customer_id].hasSecurities[_securities_id] = true;
     }

     int total_amount = customers.securities_accounts[_customer_id].total_amounts[_securities_id];


     if(_is_increase) {
         total_amount += _amount_total;
     }else {
         total_amount -= _amount_total;
     }

     customers.securities_accounts[_customer_id].total_amounts[_securities_id] = total_amount;
  }

  function setCustomerOwnedSecuritiesPosition(bytes32 _customer_id, bytes32 _securities_id, int _amount, bool _is_increase)  onlyOwner {

     int position_amount = customers.securities_accounts[_customer_id].position_amounts[_securities_id];

     if(_is_increase) {
         position_amount += _amount;
     }else {
         position_amount -= _amount;
     }

     customers.securities_accounts[_customer_id].position_amounts[_securities_id] = position_amount;
  }


  function getCustomerSecuritiesTotalAmount(bytes32 _customer_id, bytes32 _securities_id) constant returns(int) {

      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }

      return(customers.securities_accounts[_customer_id].total_amounts[_securities_id]);
  }

  function getCustomerSecuritiesPosition(bytes32 _customer_id, bytes32 _securities_id) constant returns(int) {

      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }

      return(customers.securities_accounts[_customer_id].position_amounts[_securities_id]);
  }

  function getCustomerSecuritiesList(bytes32 _customer_id, uint index) constant returns (bytes32) {
      return(customers.securities_accounts[_customer_id].securities[index]);
  }

  function getCustomerSecuritiesListLength(bytes32 _customer_id) constant returns (uint) {
      return(customers.securities_accounts[_customer_id].securities_cnt);
  }

  function getCustomerList(uint index) constant returns (bytes32) {
      return(customers.ids[index]);
  }

  function getCustomerListLength() constant returns (uint) {
      return(customers_cnt);
  }

}

// 注意Owner為TransactionMatcher contract
contract Securities is Owned{

  bytes32 securities_id;    // 公債代號
  bytes32 owned_bank;
  uint banks_cnt;

  int amount;
  int available; // 還剩多少債券
  // int unit_price;
  int interest_rateX10K;  // *10000  i.e 2% interest_rate = 200 精確到小數點第二位
  int start_tm;
  int end_tm;
  int period;   // 單位：Year（每年一期)

  struct bank {
      bytes32 [] bank_ids;   // 清算銀行list
      mapping(bytes32 => customers_account) customers_accounts;  // 客戶account 以清算銀行為index
      mapping(bytes32 => bool) hasBank;   //  以清算銀行為index
      mapping(bytes32 => int) banks_total_amount;  // 清算銀行總帳（計算利息） 以清算銀行為index
      mapping(bytes32 => int) banks_position_amount;  // 清算銀行持有部位（總帳 - 被圈存總帳) 以清算銀行為index

  }

  struct customers_account {
      bytes32 [] customer_ids; // 客戶帳號list
      uint customers_cnt;
      mapping(bytes32 => int) total_amounts;   // 客戶擁有數量    以客戶帳號為index
      mapping(bytes32 => int) position_amounts; // 客戶持有部位（總帳 - 被圈存數量）  以客戶帳號為index
      mapping(bytes32 => bool) hasCustomer;   //  是否有此客戶    以客戶帳號為index
  }

  bank private banks;

  function Securities(bytes32 _securities_id, int _amount, int _interest_rateX10K, int _start_tm, int _end_tm, int _period) {
    securities_id = _securities_id;
    owned_bank = "CB";   // centeral bank is the initial owner
    amount = _amount;
    available = _amount;
    //unit_price = _unit_price;
    interest_rateX10K = _interest_rateX10K;
    start_tm = _start_tm;
    end_tm = _end_tm;
    period = _period;
  }

  // 變更客戶擁有債券數量，注意，清算銀行自己本身也有帳號
  function setCustomerOwnedSecuritiesAmount(bytes32 _bank_id, bytes32 _customer_id, int _amount_total, bool _is_increase) onlyOwner {

     if(!banks.hasBank[_bank_id]) {
         banks.bank_ids.push(_bank_id);
         banks.hasBank[_bank_id] = true;
         banks_cnt++;
     }

     if(!banks.customers_accounts[_bank_id].hasCustomer[_customer_id]) {
         banks.customers_accounts[_bank_id].customer_ids.push(_customer_id);
         banks.customers_accounts[_bank_id].customers_cnt++;
         banks.customers_accounts[_bank_id].hasCustomer[_customer_id] = true;
     }

     int customer_amount = banks.customers_accounts[_bank_id].total_amounts[_customer_id];
     int bank_amount = banks.banks_total_amount[_bank_id];

     //int customer_position_amount = banks.customers_accounts[_bank_id].position_amounts[_customer_id];
     //int bank_position_amount = banks.banks_position_amount[_bank_id];


     if(_is_increase) {
         customer_amount += _amount_total;
         bank_amount += _amount_total;
         available -= _amount_total;
         //customer_position_amount += _amount_total;
         //bank_position_amount += _amount_total;
     }else {
         customer_amount -= _amount_total;
         bank_amount -= _amount_total;
         available += _amount_total;
         //customer_position_amount -= _amount_total;
         //bank_position_amount -= _amount_total;
     }

     banks.customers_accounts[_bank_id].total_amounts[_customer_id] = customer_amount;
     banks.banks_total_amount[_bank_id] = bank_amount;

     //banks.customers_accounts[_bank_id].position_amounts[_customer_id] = customer_position_amount;
     //banks.banks_position_amount[_bank_id] = bank_position_amount;
  }

  // 設定圈存
  function setCustomerOwnedSecuritiesPosition(bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase) onlyOwner {

     int customer_position_amount = banks.customers_accounts[_bank_id].position_amounts[_customer_id];
     int bank_position_amount = banks.banks_position_amount[_bank_id];

     if(_is_increase) {
        customer_position_amount += _amount;
        bank_position_amount += _amount;
     }else {
        customer_position_amount -= _amount;
        bank_position_amount -= _amount;
     }

     banks.customers_accounts[_bank_id].position_amounts[_customer_id] = customer_position_amount;
     banks.banks_position_amount[_bank_id] = bank_position_amount;
  }

  function getSecuritiesStatus() constant returns(int, int) {
     return(amount, available);
  }

  function getSecuritiesInfo() constant returns(int, int, int, int) {
     return(interest_rateX10K, start_tm, end_tm, period);
  }

  function getCustomerTotalAmount(bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }
     return(banks.customers_accounts[_bank_id].total_amounts[_customer_id]);
  }

  function getCustomerPosition(bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }
     return(banks.customers_accounts[_bank_id].position_amounts[_customer_id]);
  }

  function getBankTotalAmount(bytes32 _bank_id) constant returns(int) {
      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }
     return(banks.banks_total_amount[_bank_id]);
  }

  function getBankPosition(bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }
     return(banks.banks_position_amount[_bank_id]);
  }


  function getBankList(uint index) constant returns(bytes32) {
      return(banks.bank_ids[index]);
  }

  function getBankListLength() constant returns(uint) {
      return(banks_cnt);
  }

}

// TransactionMatcher必須由央行deploy 如此央行才能成為owner
contract TransactionMatcher is Owned {

  //address private owner;
  //uint private maxQueueDepth;
  //uint private timeout;

  uint ServiceState;        // 1: 開機 2: 營業開始 3: 停止接收預告
                            // 4: 停止接收電文 5: 處理跨行交易 6: 發送結帳資料 7: 關機

  bytes32[] shareQueue;     // 跨行交易用的queue
  bytes32[] privateQueue;   // 自行交易用的queue

  function TransactionMatcher() {
    owner = msg.sender;
    //maxQueueDepth = 100;
  }

  enum TxnState { Pending, Matched, Finished, Cancelled, Waiting4Payment }

  struct Transaction {
    bytes32 txnSerNo;         // 交易代號
    bytes32 from_bank_id;     // 賣方清算銀行代號
    bytes32 from_customer_id; // 賣方帳號
    bytes32 to_bank_id;       // 買方清算銀行代號
    bytes32 to_customer_id;   // 買方帳號
    int securities_amount;    // 交易面額
    int blocked_amount;       // 圈存面額
    bytes32 securities_id;    // 債券代號
    int payment;              // 紀錄實際成交金額
    TxnState state;           // 交易狀態
    uint timestamp;           // 交易發送時間
    bytes32 digest;           // 交易摘要(MD5) 買賣雙方的交易摘要需相同才可比對
    address msg_sender;       // 發送交易之區塊鏈帳戶
    bytes32 rev_txnSerNo;     // 紀錄被更正之交易代號
    int return_code;          // 紀錄傳回值
  }

  bytes32[] transactionIdx;
  mapping (bytes32 => Transaction) transactions;

  mapping (bytes32 => bool) isTransactionWaitingForMatch;  // has a transaction registered in the list
  mapping (bytes32 => bytes32) txnDigest_SerNo1;      // txn digest => txnSerNo
  //mapping (bytes32 => bytes32) txnDigest_SerNo2;      // txn digest => txnSerNo

  bytes32[] banks_list;
  mapping (bytes32 => address) bankRegistry;
  //mapping (address => bytes32) acc2Bank;
  //mapping (bytes32 => address) bankAdmins;

  bytes32[] securities_list;
  uint securities_cnt;
  mapping (bytes32 => address) securitiesRegistry;
  mapping (bytes32 => bool) hasSecurities;

  /*
  modifier isBankOwner(bytes32 _bank_id) {
    require(msg.sender == owner || acc2Bank[msg.sender] == _bank_id);
    _;
  }
  */

  event EventForCreateBank(bytes32 _bank_id);
  event EventForSetOwnedNode(bytes32 _bank_id);
  event EventForIssueSecurities(bytes32 _securities_id);
  event EventForRegisterCustomerOwnedSecuritiesAmount(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase);
  event EventForSetServiceState(uint state);
  //event EventForSetCustomerOwnedSecuritiesPosition(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id, int _amount_total, bool _is_increase);

  // privateFor[央行與所有清算行]
  function createBank(bytes32 _bank_id, address _bankOwner) onlyOwner {
      address bank = new Bank_Account(_bank_id);
      bankRegistry[_bank_id] = bank;  // 清算銀行Bank_Account合約位址
      banks_list.push(_bank_id);
      //bankAdmins[_bank_id] = _bankOwner;

      EventForCreateBank(_bank_id);
  }

  // privateFor[央行與被建立的清算行]
  // 可以讓被建立的清算行利用checkOwnedNode傳回true判斷是自己的節點 因為節點不會看到別人的Bank_Account Contract
  function setOwnedNode(bytes32 _bank_id, bool _is_true) onlyOwner {
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      bank.setOwnedNode(true);
      //bank.setBankContract(_bank_contract);

      EventForSetOwnedNode(_bank_id);
  }

  function issueSecurities(bytes32 _securities_id, int _amount,  int _interest_rateX10K, int _start_tm, int _end_tm, int _period) onlyOwner {

      if(!hasSecurities[_securities_id]) {
          securities_list.push(_securities_id);
          hasSecurities[_securities_id]=true;
          securities_cnt++;
      }

      address securities = new Securities(_securities_id, _amount,  _interest_rateX10K, _start_tm, _end_tm, _period);
      securitiesRegistry[_securities_id] = securities;

      EventForIssueSecurities(_securities_id);
  }

  function registerCustomerOwnedSecuritiesAmount(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase) onlyOwner {
      setCustomerOwnedSecuritiesAmount(_securities_id,_bank_id,_customer_id,_amount,_is_increase);
      // 註冊時要順便增加/減少持有部位
      setCustomerOwnedSecuritiesPosition(_securities_id,_bank_id,_customer_id,_amount,_is_increase);

      EventForRegisterCustomerOwnedSecuritiesAmount(_securities_id,_bank_id,_customer_id,_amount,_is_increase);
  }

  // 只能internal 呼叫，避免鏈外隨便可以改帳目
  function setCustomerOwnedSecuritiesAmount(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase)  internal {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      securities.setCustomerOwnedSecuritiesAmount(_bank_id, _customer_id, _amount, _is_increase);
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      bank.setCustomerOwnedSecuritiesAmount(_customer_id, _securities_id, _amount, _is_increase);

      //EventForSetCustomerOwnedSecuritiesAmount( _securities_id, _bank_id, _customer_id, _amount, _is_increase);
  }

  // 只能internal 呼叫，避免鏈外隨便可以改帳目
  function setCustomerOwnedSecuritiesPosition(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase) internal {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      securities.setCustomerOwnedSecuritiesPosition(_bank_id, _customer_id, _amount, _is_increase);
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      bank.setCustomerOwnedSecuritiesPosition(_customer_id, _securities_id, _amount, _is_increase);

      //EventForSetCustomerOwnedSecuritiesPosition( _securities_id, _bank_id, _customer_id, _amount, _is_increase);
  }

  function getSecuritiesStatus(bytes32 _securities_id) constant returns(int,int) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      var(a,b) = securities.getSecuritiesStatus();
      return(a,b);
  }

  function getSecuritiesInfo(bytes32 _securities_id) constant returns(int,int,int,int) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      var(a,b,c,d) = securities.getSecuritiesInfo();
      return(a,b,c,d);
  }

  function getBankSecuritiesAmount(bytes32 _securities_id, bytes32 _bank_id) constant returns(int) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      return(securities.getBankTotalAmount(_bank_id));
  }

  function getCustomerSecuritiesAmount(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      return(securities.getCustomerTotalAmount(_bank_id, _customer_id));
  }

  function getCustomerSecuritiesPosition(bytes32 _securities_id, bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      return(securities.getCustomerPosition(_bank_id, _customer_id));
  }

  function getCustomerSecuritiesListLength(bytes32 _bank_id, bytes32 _customer_id) constant returns(uint) {
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      return(bank.getCustomerSecuritiesListLength(_customer_id));
  }

  function getCustomerSecuritiesList(bytes32 _bank_id,  bytes32 _customer_id, uint index) constant returns(bytes32) {
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      return(bank.getCustomerSecuritiesList(_customer_id, index));
  }

  function getBankListLength(bytes32 _securities_id) constant returns(uint) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      return(securities.getBankListLength());
  }

  function getBankCustomerList(bytes32 _bank_id, uint index) constant returns(bytes32) {
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      return(bank.getCustomerList(index));
  }

  function getBankCustomerListLength(bytes32 _bank_id) constant returns(uint) {
      Bank_Account bank = Bank_Account(bankRegistry[_bank_id]);
      return(bank.getCustomerListLength());
  }

  function getSecuritiesOwnedByBank(bytes32 _securities_id, uint index) constant returns(bytes32) {
      Securities securities = Securities(securitiesRegistry[_securities_id]);
      return(securities.getBankList(index));
  }

  function getSecuritiesListLength() constant returns(uint) {
      return(securities_cnt);
  }

  function getSecuritiesList(uint index) constant returns(bytes32) {
      return(securities_list[index]);
  }

  //event EventForSecuritiesTransactionPending(bytes32 _txSerNo);
  event EventForSecuritiesTransactionPending(bytes32 _txSerNo);
  event EventForSecuritiesTransactionCancelled(bytes32 _txSerNo, int rc, string _reason);
  //event EventForSecuritiesTransactionError(bytes32 _txSerNo, int rc);
  //event EventForSecuritiesTransactionMatched(bytes32 _txSerNo1, bytes32 _txSerNo2);
  event EventForSecuritiesTransactionFinished(bytes32 _txSerNo1, bytes32 _txSerNo2);
  event EventForSecuritiesTransactionWaitingForPayment(bytes32 _txSerNo1, bytes32 _txSerNo2);
  event EventForSecuritiesTransactionPaymentError(bytes32 _txSerNo1, bytes32 _txSerNo2, int rc);

  // 可能為賣方清算行或是買方清算行呼叫，寫code時需要配合Quorum的private transaction的運作模式，privateFor[對方行，央行]
  // 注意，每筆交易每個在privateFor的node都會執行，寫code時要有這個思維。
  function submitInterBankTransaction(bytes32 _txSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                                         bytes32 _to_bank_id, bytes32 _to_customer_id, int _securities_amount, bytes32 _securities_id,
                                         int _payment, bytes32 _digest)
  {
    Transaction memory this_txn;

    Bank_Account seller = Bank_Account(bankRegistry[_from_bank_id]);
    Bank_Account buyer = Bank_Account(bankRegistry[_to_bank_id]);

    if(seller.checkOwnedNode()) {   // 賣方跟央行才能檢查,在買方節點無法檢查賣方的帳戶資料，這段code是必須的，否則在共識階段，買方節點上這交易會被cancel
        // 若Dapp有檢查，則這段程式跑不到，加這段檢查以防萬一

        // 若為賣方清算行打進來的交易，則圈存賣方債券戶(DLT) 賣方跟央行才做這段 因為賣方跟央行都看得到賣方的Bank_Account Contract
        // 在共識階段，買方清算行節點會跳過這段，結果資料會跟賣方節點不同，但因為買方不需要也不能夠知道賣方的帳戶資料，因此這是必要的。
        if(bytes1(uint8(uint(_txSerNo) / (2**((31 - 5) * 8)))) == 'S') {

            if( getCustomerSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id) < _securities_amount) {
                // 賣方(from)券數持有部位不足
                this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _securities_amount,0, _securities_id, _payment, TxnState.Cancelled, now, _digest, msg.sender, "", 3 );
                transactionIdx.push(_txSerNo);
                transactions[_txSerNo] = this_txn;
                EventForSecuritiesTransactionCancelled(_txSerNo, 3, "");
                return;
            }

            setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);
        }
    }

    // 須處理買方先打交易 但是賣方券不夠 造成交易變成pending 賣方要打交易將買方節點該交易的狀態設為cancelled

    // matching transaction 交易比對
    if( isTransactionWaitingForMatch[_digest]) {

        if (msg.sender == transactions[txnDigest_SerNo1[_digest]].msg_sender) {
            // 同一個msg.sender打相同交易進區塊鍊，設為Pending 因無法判斷是兩筆不同交易或是打錯
            this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _securities_amount, 0, _securities_id, _payment, TxnState.Pending, now, _digest, msg.sender, "", 0);
            transactionIdx.push(_txSerNo);
            transactions[_txSerNo] = this_txn;
            enShareQueue(_txSerNo);
            EventForSecuritiesTransactionPending(_txSerNo);
            return;

        }else {

            bytes32 _txSerNo1 = txnDigest_SerNo1[_digest];

            setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Waiting4Payment));   // 將前一筆狀態設為Waiting4Payment

            isTransactionWaitingForMatch[_digest] = false;

            delete isTransactionWaitingForMatch[_digest];
            delete txnDigest_SerNo1[_digest];

            // 注意：紀錄圈存額度
            // 不管買方或賣方都要記錄圈存數量
            this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _securities_amount, _securities_amount, _securities_id, _payment, TxnState.Waiting4Payment, now, _digest, msg.sender, "", 0);
            transactionIdx.push(_txSerNo);
            transactions[_txSerNo] = this_txn;

            if(_payment == 0) {  // FOP無款交易，不用到同資

                // 更新DLT債券戶資訊 賣方跟央行才做這段
                // 在共識階段，買方清算行節點會跳過這段，因此資料會跟賣方節點不同，但因為買方不需要也不能夠知道賣方的帳戶資料，因此這是必要的。
                if(seller.checkOwnedNode()) {
                    setCustomerOwnedSecuritiesAmount(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);
                    // 賣方已圈存，不須再增加持有部位
                }
                // 更新DLT債券戶資訊 買方跟央行才做這段
                // 在共識階段，賣方清算行節點會跳過這段，因此資料會跟買方節點不同，但因為賣方不需要也不能夠知道買方的帳戶資料，因此這是必要的。
                if(buyer.checkOwnedNode()) {
                    setCustomerOwnedSecuritiesAmount(_securities_id, _to_bank_id, _to_customer_id, _securities_amount, true);
                    // 增加買方持有部位
                    setCustomerOwnedSecuritiesPosition(_securities_id, _to_bank_id, _to_customer_id, _securities_amount, true);
                }

                setSecuritiesTransactionState(_txSerNo, uint(TxnState.Finished));  // 將Transaction設為Finished
                setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Finished));  // 將Transaction設為Finished

                // 移出Queue
                deShareQueue(_txSerNo);
                deShareQueue(_txSerNo1);

                EventForSecuritiesTransactionFinished(_txSerNo, _txSerNo1);
            }else {
                EventForSecuritiesTransactionWaitingForPayment(_txSerNo, _txSerNo1);
            }

        }

    }else {

            isTransactionWaitingForMatch[_digest] = true;

            // 不管買方或賣方都要記錄圈存數量
            txnDigest_SerNo1[_digest] = _txSerNo;
                    this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _securities_amount, _securities_amount, _securities_id, _payment, TxnState.Pending, now, _digest, msg.sender, "", 0);

            transactionIdx.push(_txSerNo);
            transactions[_txSerNo] = this_txn;

            enShareQueue(_txSerNo);

            EventForSecuritiesTransactionPending(_txSerNo);
    }

  }

  // privateFor [央行] （交易只會在清算行本身及央行節點上面執行)
  function submitIntraBankTransaction(bytes32 _txSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                                         bytes32 _to_customer_id, int _securities_amount, bytes32 _securities_id,
                                         int _payment, bytes32 _digest)
  {
    Transaction memory this_txn;

    if(_from_customer_id == _to_customer_id) {
        // Do nothing
        // 賣方與買方為同一人
        this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                         _securities_amount, 0, _securities_id, _payment, TxnState.Cancelled, now, _digest, msg.sender, "", 2);
        transactionIdx.push(_txSerNo);
        transactions[_txSerNo] = this_txn;
        //enqueue(_txSerNo);
        //queued = true;
        EventForSecuritiesTransactionCancelled(_txSerNo, 2, "");
        return;
    }

    // 賣方才檢查並圈存，
    if(bytes1(uint8(uint(_txSerNo) / (2**((31 - 5) * 8)))) == 'S') {
        if( getCustomerSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id) < _securities_amount) {
            // 賣方(from)券數持有部位不足
            this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                         _securities_amount, 0, _securities_id, _payment, TxnState.Cancelled, now, _digest, msg.sender, "", 3);
            transactionIdx.push(_txSerNo);
            transactions[_txSerNo] = this_txn;
            //enqueue(_txSerNo);
            //queued = true;
            EventForSecuritiesTransactionCancelled(_txSerNo, 3, "");
            return;
        }

        //自行圈存賣方債券戶(DLT)
        setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);

    }

    // matching transaction 交易比對
    if( isTransactionWaitingForMatch[_digest]) {

        //Transaction 是 atomic 不用擔心Double Spending的問題
        bytes32 _txSerNo1 = txnDigest_SerNo1[_digest];

        setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Matched));

        isTransactionWaitingForMatch[_digest] = false;

        delete isTransactionWaitingForMatch[_digest];
        delete txnDigest_SerNo1[_digest];

        this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                         _securities_amount, _securities_amount, _securities_id, _payment, TxnState.Matched, now, _digest, msg.sender, "", 0);
        transactionIdx.push(_txSerNo);
        transactions[_txSerNo] = this_txn;

        // 更新DLT債券戶資訊
        setCustomerOwnedSecuritiesAmount(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);
        setCustomerOwnedSecuritiesAmount(_securities_id, _from_bank_id, _to_customer_id, _securities_amount, true);
        // 賣方已圈存，不須再增加持有部位
        //setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);
        setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _to_customer_id, _securities_amount, true);

        setSecuritiesTransactionState(_txSerNo, uint(TxnState.Finished));  // 將Transaction設為Finished
        setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Finished));  // 將Transaction設為Finished


        dePrivateQueue(_txSerNo);
        dePrivateQueue(_txSerNo1);

        EventForSecuritiesTransactionFinished(_txSerNo, _txSerNo1);

    }else {

        isTransactionWaitingForMatch[_digest] = true;
        txnDigest_SerNo1[_digest] = _txSerNo;
        this_txn = Transaction(_txSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                     _securities_amount, _securities_amount, _securities_id, _payment, TxnState.Pending, now, _digest, msg.sender, "", 0);

        transactionIdx.push(_txSerNo);
        transactions[_txSerNo] = this_txn;

        enPrivateQueue(_txSerNo);

        EventForSecuritiesTransactionPending(_txSerNo);
    }

  }

  // privateFor [央行] （交易只會在清算行本身及央行節點上面執行)
  // reason 不會存在Trsnactions裡面 但是在傳進來的過程中（Payload) 已經記錄在區塊裡
  function submitSetTransactionCancelled(bytes32 _rev_txSerNo, bytes32 _txSerNo, int _rc, string _reason) {

      Transaction this_txn = transactions[_rev_txSerNo];

      // 只有Pending與Waiting4Payment才處理
      if( (this_txn.state == TxnState.Pending) || (this_txn.state == TxnState.Waiting4Payment) ) {

        // End-of-Day 時因為交易沒有發生，要解圈
        //if(this_txn.state == TxnState.Waiting4Payment) {

            int _blocked_amount = this_txn.blocked_amount;
            bytes32 _securities_id = this_txn.securities_id;
            bytes32 _from_bank_id = this_txn.from_bank_id;
            bytes32 _from_customer_id = this_txn.from_customer_id;

            //買賣方跟央行都做這段，但買方做沒用，只是寫入無意義的別家清算行資料
            //if(msg.sender == bankAdmins[_from_bank_id] || msg.sender == owner) {
            Bank_Account seller = Bank_Account(bankRegistry[_from_bank_id]);

            if(_rc == 5) {   // 只有賣方發的交易才解圈 買方發的交易也會進來 因此用rc 分辨

                if(seller.checkOwnedNode() && _blocked_amount > 0) {
                    // 解除圈存
                    setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id, _blocked_amount, true);
                }
            }
        //}

        this_txn.rev_txnSerNo = _txSerNo;
        this_txn.state = TxnState.Cancelled;

        this_txn.return_code = _rc;

        bytes32 _digest = getTransactionDigest(_rev_txSerNo);
        isTransactionWaitingForMatch[_digest] = false;
        delete isTransactionWaitingForMatch[_digest];
        //setSecuritiesTransactionState(_rev_txSerNo, uint(TxnState.Cancelled));

        Transaction _txn = transactions[_txSerNo];
        _txn.rev_txnSerNo = _rev_txSerNo;

        EventForSecuritiesTransactionCancelled(_rev_txSerNo, _rc, _reason);

      }

  }

  // 同資回應後央行節點呼叫，只有央行可發動
  function settleInterBankTransaction(bytes32 _txSerNo1, bytes32 _txSerNo2, int _cb_return_code, bool _isNettingSuccess) onlyOwner returns(bool) {

      Transaction txn1 = transactions[_txSerNo1];
      Transaction txn2 = transactions[_txSerNo2];

      Bank_Account seller = Bank_Account(bankRegistry[txn1.from_bank_id]);
      Bank_Account buyer = Bank_Account(bankRegistry[txn1.to_bank_id]);

      if(_isNettingSuccess == true) {

        if(seller.checkOwnedNode()) {
            // 更新DLT債券戶資訊
            setCustomerOwnedSecuritiesAmount(txn1.securities_id, txn1.from_bank_id, txn1.from_customer_id, txn1.securities_amount, false);
        }

        if(buyer.checkOwnedNode()) {
            setCustomerOwnedSecuritiesAmount(txn1.securities_id, txn1.to_bank_id, txn1.to_customer_id, txn1.securities_amount, true);
            // 增加買方持有部位
            setCustomerOwnedSecuritiesPosition(txn1.securities_id, txn1.to_bank_id, txn1.to_customer_id, txn1.securities_amount, true);
        }

        setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Finished));  // 將Transaction設為Finished
        setSecuritiesTransactionState(_txSerNo2, uint(TxnState.Finished));  // 將Transaction設為Finished

        deShareQueue(_txSerNo1);
        deShareQueue(_txSerNo2);

        EventForSecuritiesTransactionFinished(_txSerNo1, _txSerNo2);

      }else {

        if(_cb_return_code == 500) {
            if(seller.checkOwnedNode()) {
                // 同資系統錯誤，解除圈存賣方債券戶(DLT)
                setCustomerOwnedSecuritiesPosition(txn1.securities_id, txn1.from_bank_id, txn1.from_customer_id, txn1.securities_amount, true);
            }

            setSecuritiesTransactionState(_txSerNo1, uint(TxnState.Cancelled));
            setSecuritiesTransactionState(_txSerNo2, uint(TxnState.Cancelled));
        }

        txn1.return_code = _cb_return_code; // 設定同資錯誤碼
        txn2.return_code = _cb_return_code; // 設定同資錯誤碼

        EventForSecuritiesTransactionPaymentError(_txSerNo1, _txSerNo2, _cb_return_code);

      }

      return _isNettingSuccess;
  }

  function setServiceState(uint state) onlyOwner {
      ServiceState = state;
      EventForSetServiceState(state);
  }

  function getServiceState() returns(uint) {
      return ServiceState;
  }

  function setSecuritiesTransactionState(bytes32 _txSerNo, uint _txn_state)  internal {

    Transaction this_txn = transactions[_txSerNo];

    // Initiate, Confirmed, ReadyToSettle, Settled, Finished, Canceled
    if( _txn_state == uint(TxnState.Pending)) {
        this_txn.state = TxnState.Pending;
    }else if( _txn_state == uint(TxnState.Waiting4Payment)) {
        this_txn.state = TxnState.Waiting4Payment;
    }else if( _txn_state == uint(TxnState.Matched)) {
        this_txn.state = TxnState.Matched;
    }else if( _txn_state == uint(TxnState.Finished))  {
        this_txn.state = TxnState.Finished;
    }else if( _txn_state == uint(TxnState.Cancelled))  {
        this_txn.state = TxnState.Cancelled;
    }
  }

  /*
  function setSecuritiesTransactionBlockedAmount(bytes32 _txSerNo, int _blocked_amount)  internal {

    Transaction this_txn = transactions[_txSerNo];
    this_txn.blocked_amount = _blocked_amount;

  }
  */

  function enShareQueue(bytes32 _txSerNo) internal {
    shareQueue.push(_txSerNo);
  }

  function deShareQueue(bytes32 _txSerNo) internal {
    for(uint i=0; i< shareQueue.length; i++) {
        if(_txSerNo == shareQueue[i]) {
            delete shareQueue[i];
            break;
        }
    }
  }

  function enPrivateQueue(bytes32 _txSerNo) internal {
    privateQueue.push(_txSerNo);
  }

  function dePrivateQueue(bytes32 _txSerNo) internal {
    for(uint i=0; i< privateQueue.length; i++) {
        if(_txSerNo == privateQueue[i]) {
            delete privateQueue[i];
            break;
        }
    }
  }

  function getShareQueueDepth() constant returns(uint) {
      return shareQueue.length;
  }

  function getPrivateQueueDepth() constant returns(uint) {
      return privateQueue.length;
  }

  function getShareQueueEntry(uint index) constant returns(bytes32) {
      return shareQueue[index];
  }

  function getPrivateQueueEntry(uint index) constant returns(bytes32) {
      return privateQueue[index];
  }

  function clearQueue() onlyOwner {
      // 清除ShareQueue的所有交易,由央行發動清Queue，因為日終交易發動時機是央行決定的
      for (uint i=0; i< shareQueue.length; i++) {
          delete shareQueue[i];
      }
      shareQueue.length = 0;

      // 清除PrivateQueue的所有交易,由央行發動清Queue，因為日終交易發動時機是央行決定的
      for (uint j=0; j< privateQueue.length; j++) {
          delete privateQueue[j];
      }
      privateQueue.length = 0;
  }


  function getTransactionListLength() constant returns(uint) {
      return transactionIdx.length;
  }

  function getTransactionList(uint index) constant returns(bytes32) {
      return transactionIdx[index];
  }

  function getTransactionInfo(bytes32 _txSerNo) constant returns(bytes32, bytes32 , bytes32 , bytes32 , int , bytes32, int, uint) {
    Transaction this_txn = transactions[_txSerNo];
    return(this_txn.from_bank_id, this_txn.from_customer_id,
                                             this_txn.to_bank_id, this_txn.to_customer_id,
                                             this_txn.securities_amount, this_txn.securities_id, this_txn.payment, this_txn.timestamp
                                             );
  }

  function getTransactionReverseTxnSeq(bytes32 _txSerNo) constant returns(bytes32) {
    Transaction this_txn = transactions[_txSerNo];
    return(this_txn.rev_txnSerNo);
  }

  function getTransactionDigest(bytes32 _txSerNo) constant returns(bytes32 _digest) {
    Transaction this_txn = transactions[_txSerNo];
    return(this_txn.digest);
  }

  function getTransactionState(bytes32 _txSerNo) constant returns(uint, int) {
    Transaction this_txn = transactions[_txSerNo];
    return(uint(this_txn.state), this_txn.return_code);
  }



}
