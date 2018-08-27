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

// 存放清算銀行客戶的款戶，以便於使用清算銀行及客戶帳號為key來查詢
// 注意Owner為TransactionMatcher contract
contract Bank_CashAccount is Owned {

  bytes32 bank_id;
  uint customers_cnt;

  bool private isOwnedNode = false;  // 使用private transaction來設定flag，
                                     // 每個Bank_Account Contract只有在自己跟央行才會設flag
                                     // 以便判斷是在那個節點上跑
  struct customer {
      bytes32 [] ids;
      mapping(bytes32 => cash_account) cash_accounts; // 以id為index
      mapping(bytes32 => bool) hasCustomer;
  }

  struct cash_account {
      mapping(bytes32 => int) total_amounts;   // 總數量     以債券代號為index
      mapping(bytes32 => int) position_amounts; // 持有部位  以債券代號為index
      mapping(bytes32 => bool) hasAccounts;
  }

  customer private customers;

  function Bank_CashAccount(bytes32 _bank_id) {
     bank_id = _bank_id;
  }

  function setOwnedNode(bool _is_true) onlyOwner {
     isOwnedNode = _is_true;
  }

  function checkOwnedNode() constant returns(bool) {
     return isOwnedNode;
  }

  // 設定客戶擁有債券數量，注意，清算銀行自己本身也有帳號 客戶持有部位也要增加
  function setCustomerCashAmount(bytes32 _customer_id, int _amount_total, bool _is_increase) onlyOwner {

     if(!customers.hasCustomer[_customer_id]) {
         customers.ids.push(_customer_id);
         customers_cnt++;
         customers.hasCustomer[_customer_id] = true;
     }

     if(!customers.cash_accounts[_customer_id].hasAccounts[_customer_id]) {
         customers.cash_accounts[_customer_id].hasAccounts[_customer_id] = true;
     }

     int total_amount = customers.cash_accounts[_customer_id].total_amounts[_customer_id];


     if(_is_increase) {
         total_amount += _amount_total;
     }else {
         total_amount -= _amount_total;
     }

     customers.cash_accounts[_customer_id].total_amounts[_customer_id] = total_amount;
  }

  function setCustomerCashPosition(bytes32 _customer_id, int _amount, bool _is_increase)  onlyOwner {

     int position_amount = customers.cash_accounts[_customer_id].position_amounts[_customer_id];

     if(_is_increase) {
         position_amount += _amount;
     }else {
         position_amount -= _amount;
     }

     customers.cash_accounts[_customer_id].position_amounts[_customer_id] = position_amount;
  }


  function getCustomerCashAmount(bytes32 _customer_id) constant returns(int) {

      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }

      return(customers.cash_accounts[_customer_id].total_amounts[_customer_id]);
  }

  function getCustomerCashPosition(bytes32 _customer_id) constant returns(int) {

      if(msg.sender != owner) {
        // do nothing, just return
        return(0);
      }

      return(customers.cash_accounts[_customer_id].position_amounts[_customer_id]);
  }

  function getCustomerList(uint index) constant returns (bytes32) {
      return(customers.ids[index]);
  }

  function getCustomerListLength() constant returns (uint) {
      return(customers_cnt);
  }

}


// TransactionMatcher必須由央行deploy 如此央行才能成為owner
contract PaymentMatcher is Owned {

  bytes32[] shareQueue;     // 跨行交易用的queue
  bytes32[] privateQueue;   // 自行交易用的queue

  function PaymentMatcher() {
    owner = msg.sender;
    //maxQueueDepth = 100;
  }

  enum PaymentState { Pending, Matched, Finished, Cancelled, Waiting4Confirm }

  struct Payment {
    bytes32 paymentSerNo;         // 交易代號
    bytes32 from_bank_id;     // 賣方清算銀行代號
    bytes32 from_customer_id; // 賣方帳號
    bytes32 to_bank_id;       // 買方清算銀行代號
    bytes32 to_customer_id;   // 買方帳號
    int payment;    // 交易面額
    int blocked_amount;       // 圈存面額
    PaymentState state;           // 交易狀態
    uint timestamp;           // 交易發送時間
    bytes32 digest;           // 交易摘要(MD5) 買賣雙方的交易摘要需相同才可比對
    address msg_sender;       // 發送交易之區塊鏈帳戶
    bytes32 rev_paymentSerNo;     // 紀錄被更正之交易代號
    int return_code;          // 紀錄傳回值
    uint timeout;             // timeout (sec)
    bytes32 paymentHash;      // Hash(X) , X 為 secret
    bytes32 secret;
  }

  bytes32[] paymentIdx;
  mapping (bytes32 => Payment) Payments;

  mapping (bytes32 => bool) isPaymentWaitingForMatch;  // has a transaction registered in the list
  mapping (bytes32 => bytes32) paymentDigest_SerNo1;      // txn digest => txnSerNo

  bytes32[] banks_list;
  mapping (bytes32 => address) bankRegistry;

  event EventForCreateCashBank(bytes32 _bank_id);
  event EventForSetOwnedNode(bytes32 _bank_id);

  // privateFor[央行與所有清算行]
  function createCashBank(bytes32 _bank_id, address _bankOwner) onlyOwner {
      address bank = new Bank_CashAccount(_bank_id);
      bankRegistry[_bank_id] = bank;  // 清算銀行Bank_Account合約位址
      banks_list.push(_bank_id);
      //bankAdmins[_bank_id] = _bankOwner;

      EventForCreateCashBank(_bank_id);
  }

  // privateFor[央行與被建立的清算行]
  // 可以讓被建立的清算行利用checkOwnedNode傳回true判斷是自己的節點 因為節點不會看到別人的Bank_Account Contract
  function setOwnedNode(bytes32 _bank_id, bool _is_true) onlyOwner {
      Bank_CashAccount bank = Bank_CashAccount(bankRegistry[_bank_id]);
      bank.setOwnedNode(true);
      //bank.setBankContract(_bank_contract);

      EventForSetOwnedNode(_bank_id);
  }

  function registCustomerCash(bytes32 _bank_id, bytes32 _customer_id, int _amount) {
      setCustomerCashAmount(_bank_id, _customer_id, _amount, true);
      setCustomerCashPosition(_bank_id, _customer_id, _amount, true);
  }

  // 只能internal 呼叫，避免鏈外隨便可以改帳目
  function setCustomerCashAmount(bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase)  internal {
      Bank_CashAccount bank = Bank_CashAccount(bankRegistry[_bank_id]);
      bank.setCustomerCashAmount(_customer_id, _amount, _is_increase);

      //EventForSetCustomerOwnedSecuritiesAmount( _securities_id, _bank_id, _customer_id, _amount, _is_increase);
  }

  // 只能internal 呼叫，避免鏈外隨便可以改帳目
  function setCustomerCashPosition(bytes32 _bank_id, bytes32 _customer_id, int _amount, bool _is_increase) internal {
      Bank_CashAccount bank = Bank_CashAccount(bankRegistry[_bank_id]);
      bank.setCustomerCashPosition(_customer_id, _amount, _is_increase);

      //EventForSetCustomerOwnedSecuritiesPosition( _securities_id, _bank_id, _customer_id, _amount, _is_increase);
  }

  function getCustomerCashAmount(bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      Bank_CashAccount bank = Bank_CashAccount(bankRegistry[_bank_id]);
      return(bank.getCustomerCashAmount(_customer_id));
  }

  function getCustomerCashPosition(bytes32 _bank_id, bytes32 _customer_id) constant returns(int) {
      Bank_CashAccount bank = Bank_CashAccount(bankRegistry[_bank_id]);
      return(bank.getCustomerCashPosition(_customer_id));
  }


  event EventForPaymentPending(bytes32 _paymentSerNo);
  event EventForPaymentCancelled(bytes32 _paymentSerNo, int rc, string _reason);
  event EventForPaymentFinished(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2);
  event EventForPaymentWaitingForConfirm(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2);
  event EventForPaymentError(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, int rc);
  event EventForPaymentConfirmed(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, address msg_sender, bytes32 _paymentHash, bytes32 _secret);

  // 可能為賣方清算行或是買方清算行呼叫，寫code時需要配合Quorum的private transaction的運作模式，privateFor[對方行，央行]
  // 注意，每筆交易每個在privateFor的node都會執行，寫code時要有這個思維。
  function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                                         bytes32 _to_bank_id, bytes32 _to_customer_id,
                                         int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)
  {

    if(_payment == 0) {
        return;
    }

    Payment memory this_payment;

    Bank_CashAccount seller = Bank_CashAccount(bankRegistry[_from_bank_id]);
    Bank_CashAccount buyer = Bank_CashAccount(bankRegistry[_to_bank_id]);

    if(buyer.checkOwnedNode()) {   // 買方跟央行才能檢查,在賣方節點無法檢查賣方的帳戶資料，這段code是必須的，否則在共識階段，買方節點上這交易會被cancel
        // 若Dapp有檢查，則這段程式跑不到，加這段檢查以防萬一
        if( getCustomerCashPosition(_to_bank_id, _to_customer_id) < _payment) {
            // 買方(from)券數持有部位不足
            this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _payment, 0, PaymentState.Cancelled, now, _digest, msg.sender, "", 3 , _timeout, _paymentHash, "");
            paymentIdx.push(_paymentSerNo);
            Payments[_paymentSerNo] = this_payment;
            EventForPaymentCancelled(_paymentSerNo, 3, "");
            return;
        }

        // 若為買方清算行打進來的交易，則圈存買方債券戶(DLT) 買方跟央行才做這段 因為買方跟央行都看得到賣方的Bank_Account Contract
        // 在共識階段，賣方清算行節點會跳過這段，結果資料會跟買方節點不同，但因為賣方不需要也不能夠知道買方的帳戶資料，因此這是必要的。
        if(bytes1(uint8(uint(_paymentSerNo) / (2**((31 - 5) * 8)))) == 'B') {
            setCustomerCashPosition( _to_bank_id, _to_customer_id, _payment, false);
        }
    }

    // 須處理買方先打交易 但是賣方券不夠 造成交易變成pending 賣方要打交易將買方節點該交易的狀態設為cancelled

    // matching payment 交易比對
    if( isPaymentWaitingForMatch[_digest]) {

        if (msg.sender == Payments[paymentDigest_SerNo1[_digest]].msg_sender) {
            // 同一個msg.sender打相同交易進區塊鍊，設為Pending 因無法判斷是兩筆不同交易或是打錯
            this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _payment, 0, PaymentState.Pending, now, _digest, msg.sender, "", 0, _timeout, _paymentHash, "");
            paymentIdx.push(_paymentSerNo);
            Payments[_paymentSerNo] = this_payment;
            enShareQueue(_paymentSerNo);
            EventForPaymentPending(_paymentSerNo);
            return;

        }else {

            bytes32 _paymentSerNo1 = paymentDigest_SerNo1[_digest];

            setPaymentState(_paymentSerNo1, uint(PaymentState.Waiting4Confirm));   // 將前一筆狀態設為Waiting4Confirm

            isPaymentWaitingForMatch[_digest] = false;

            delete isPaymentWaitingForMatch[_digest];
            delete paymentDigest_SerNo1[_digest];

            // 注意：紀錄圈存額度
            // 不管買方或賣方都要記錄圈存數量
            this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _payment, _payment, PaymentState.Waiting4Confirm, now, _digest, msg.sender, "", 0, _timeout, _paymentHash, "");
            paymentIdx.push(_paymentSerNo);
            Payments[_paymentSerNo] = this_payment;

            EventForPaymentWaitingForConfirm(_paymentSerNo, _paymentSerNo1);

        }

    }else {

            isPaymentWaitingForMatch[_digest] = true;

            // 不管買方或賣方都要記錄圈存數量
            paymentDigest_SerNo1[_digest] = _paymentSerNo;
                    this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _to_bank_id, _to_customer_id,
                         _payment, _payment, PaymentState.Pending, now, _digest, msg.sender, "", 0, _timeout, _paymentHash, "");

            paymentIdx.push(_paymentSerNo);
            Payments[_paymentSerNo] = this_payment;

            enShareQueue(_paymentSerNo);

            EventForPaymentPending(_paymentSerNo);
    }

  }

  // privateFor [央行] （交易只會在清算行本身及央行節點上面執行)
  function submitIntraBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                                         bytes32 _to_customer_id, int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)
  {
    if(_payment == 0) {
        return;
    }

    Payment memory this_payment;

    if(_from_customer_id == _to_customer_id) {
        // Do nothing
        // 賣方與買方為同一人
        this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                         _payment, 0, PaymentState.Cancelled, now, _digest, msg.sender, "", 2, _timeout, _paymentHash, "");
        paymentIdx.push(_paymentSerNo);
        Payments[_paymentSerNo] = this_payment;
        //enqueue(_txSerNo);
        //queued = true;
        EventForPaymentCancelled(_paymentSerNo, 2, "");
        return;
    }

    // 買賣方皆為同一個節點，不會有跨行抓不到資料的問題，因此不判斷是買方或賣方，一律檢查，

    if(bytes1(uint8(uint(_paymentSerNo) / (2**((31 - 5) * 8)))) == 'B') {

        if( getCustomerCashPosition(_from_bank_id, _to_customer_id) < _payment) {
            // 賣方(from)券數持有部位不足
            this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                             _payment, 0, PaymentState.Cancelled, now, _digest, msg.sender, "", 3, _timeout, _paymentHash, "");
            paymentIdx.push(_paymentSerNo);
            Payments[_paymentSerNo] = this_payment;
            //enqueue(_txSerNo);
            //queued = true;
            EventForPaymentCancelled(_paymentSerNo, 3, "");
            return;
        }
        //自行圈存買方(DLT)
        setCustomerCashPosition( _from_bank_id, _to_customer_id, _payment, false);
    }

    // matching transaction 交易比對
    if( isPaymentWaitingForMatch[_digest]) {

        //Transaction 是 atomic 不用擔心Double Spending的問題
        bytes32 _paymentSerNo1 = paymentDigest_SerNo1[_digest];

        setPaymentState(_paymentSerNo1, uint(PaymentState.Matched));

        isPaymentWaitingForMatch[_digest] = false;

        delete isPaymentWaitingForMatch[_digest];
        delete paymentDigest_SerNo1[_digest];

        this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                         _payment, _payment, PaymentState.Matched, now, _digest, msg.sender, "", 0, _timeout, _paymentHash, "");
        paymentIdx.push(_paymentSerNo);
        Payments[_paymentSerNo] = this_payment;

        // 更新DLT債券戶資訊
        setCustomerCashAmount(_from_bank_id, _from_customer_id, _payment, true);
        setCustomerCashAmount(_from_bank_id, _to_customer_id, _payment, false);
        // 買方已圈存，不須再增加持有部位
        //setCustomerOwnedSecuritiesPosition(_securities_id, _from_bank_id, _from_customer_id, _securities_amount, false);
        setCustomerCashPosition(_from_bank_id, _from_customer_id, _payment, true);

        setPaymentState(_paymentSerNo, uint(PaymentState.Finished));  // 將Transaction設為Finished
        setPaymentState(_paymentSerNo1, uint(PaymentState.Finished));  // 將Transaction設為Finished


        dePrivateQueue(_paymentSerNo);
        dePrivateQueue(_paymentSerNo1);

        EventForPaymentFinished(_paymentSerNo, _paymentSerNo1);

    }else {

        isPaymentWaitingForMatch[_digest] = true;
        paymentDigest_SerNo1[_digest] = _paymentSerNo;
        this_payment = Payment(_paymentSerNo, _from_bank_id, _from_customer_id, _from_bank_id, _to_customer_id,
                     _payment, _payment, PaymentState.Pending, now, _digest, msg.sender, "", 0, _timeout, _paymentHash, "");

        paymentIdx.push(_paymentSerNo);
        Payments[_paymentSerNo] = this_payment;

        enPrivateQueue(_paymentSerNo);

        EventForPaymentPending(_paymentSerNo);
    }

  }

  // privateFor [央行] （交易只會在清算行本身及央行節點上面執行)
  // reason 不會存在Trsnactions裡面 但是在傳進來的過程中（Payload) 已經記錄在區塊裡
  function submitSetPaymentCancelled(bytes32 _rev_paymentSerNo, bytes32 _paymentSerNo, int _rc, string _reason) {

      Payment this_payment = Payments[_rev_paymentSerNo];

      // 只有Pending與Waiting4Confirm才處理
      if( (this_payment.state == PaymentState.Pending) || (this_payment.state == PaymentState.Waiting4Confirm) ) {

            int _blocked_amount = this_payment.blocked_amount;
            bytes32 _to_bank_id = this_payment.to_bank_id;
            bytes32 _to_customer_id = this_payment.to_customer_id;

            //買賣方跟央行都做這段，但賣方做沒用，只是寫入無意義的別家清算行資料
            //if(msg.sender == bankAdmins[_from_bank_id] || msg.sender == owner) {
            Bank_CashAccount buyer = Bank_CashAccount(bankRegistry[_to_bank_id]);

            if(_rc == 5) {   // 只有賣方發的交易才解圈 買方發的交易也會進來 因此用rc 分辨

                if(buyer.checkOwnedNode() && _blocked_amount > 0) {
                    // 解除圈存
                    setCustomerCashPosition(_to_bank_id, _to_customer_id, _blocked_amount, true);
                }
            }
        //}

        this_payment.rev_paymentSerNo = _paymentSerNo;
        this_payment.state = PaymentState.Cancelled;

        this_payment.return_code = _rc;

        bytes32 _digest = getPaymentDigest(_rev_paymentSerNo);
        isPaymentWaitingForMatch[_digest] = false;
        delete isPaymentWaitingForMatch[_digest];
        //setSecuritiesTransactionState(_rev_txSerNo, uint(TxnState.Cancelled));

        Payment _payment = Payments[_paymentSerNo];
        _payment.rev_paymentSerNo = _rev_paymentSerNo;

        EventForPaymentCancelled(_rev_paymentSerNo, _rc, _reason);

      }

  }

  function submitSetPaymentConfirmed(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, bytes32 _paymentHash, bytes32 _secret) {
      // 傳回 msg_sender 以及 _paymentHash 供  Oracle 驗證 呼叫交易即確認msg.sender的簽章 不需再用 ecrecover

      Payment payment1 = Payments[_paymentSerNo1];
      Payment payment2 = Payments[_paymentSerNo2];

      payment1.secret = _secret;
      payment2.secret = _secret;

      EventForPaymentConfirmed(_paymentSerNo1, _paymentSerNo2, msg.sender, _paymentHash, _secret);
  }

  // 同資回應後央行節點呼叫，只有央行可發動
  function settleInterBankPayment(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, int _cb_return_code, bool _isNettingSuccess) onlyOwner returns(bool) {

      Payment payment1 = Payments[_paymentSerNo1];
      Payment payment2 = Payments[_paymentSerNo2];

      Bank_CashAccount seller = Bank_CashAccount(bankRegistry[payment1.from_bank_id]);
      Bank_CashAccount buyer = Bank_CashAccount(bankRegistry[payment1.to_bank_id]);

      if(_isNettingSuccess == true) {

        if(seller.checkOwnedNode()) {
            // 更新DLT債券戶資訊
            setCustomerCashAmount(payment1.from_bank_id, payment1.from_customer_id, payment1.payment, true);
            // 增加賣方持有部位
            setCustomerCashPosition(payment1.from_bank_id, payment1.from_customer_id, payment1.payment, true);
        }

        if(buyer.checkOwnedNode()) {
            setCustomerCashAmount(payment1.to_bank_id, payment1.to_customer_id, payment1.payment, false);
        }

        setPaymentState(_paymentSerNo1, uint(PaymentState.Finished));  // 將Transaction設為Finished
        setPaymentState(_paymentSerNo2, uint(PaymentState.Finished));  // 將Transaction設為Finished

        deShareQueue(_paymentSerNo1);
        deShareQueue(_paymentSerNo2);

        EventForPaymentFinished(_paymentSerNo1, _paymentSerNo2);

      }else {

        if(_cb_return_code == 500) {
            if(buyer.checkOwnedNode()) {
                // 同資系統錯誤，解除圈存買方戶(DLT)
                setCustomerCashPosition(payment1.to_bank_id, payment1.to_customer_id, payment1.payment, true);
            }

            setPaymentState(_paymentSerNo1, uint(PaymentState.Cancelled));
            setPaymentState(_paymentSerNo2, uint(PaymentState.Cancelled));
        }

        payment1.return_code = _cb_return_code; // 設定同資錯誤碼
        payment2.return_code = _cb_return_code; // 設定同資錯誤碼

        EventForPaymentError(_paymentSerNo1, _paymentSerNo2, _cb_return_code);

      }

      return _isNettingSuccess;
  }

  function setPaymentState(bytes32 _paymentSerNo, uint _payment_state)  internal {

    Payment this_payment = Payments[_paymentSerNo];

    // Initiate, Confirmed, ReadyToSettle, Settled, Finished, Canceled
    if( _payment_state == uint(PaymentState.Pending)) {
        this_payment.state = PaymentState.Pending;
    }else if( _payment_state == uint(PaymentState.Waiting4Confirm)) {
        this_payment.state = PaymentState.Waiting4Confirm;
    }else if( _payment_state == uint(PaymentState.Matched)) {
        this_payment.state = PaymentState.Matched;
    }else if( _payment_state == uint(PaymentState.Finished))  {
        this_payment.state = PaymentState.Finished;
    }else if( _payment_state == uint(PaymentState.Cancelled))  {
        this_payment.state = PaymentState.Cancelled;
    }
  }

  function enShareQueue(bytes32 _paymentSerNo) internal {
    shareQueue.push(_paymentSerNo);
  }

  function deShareQueue(bytes32 _paymentSerNo) internal {
    for(uint i=0; i< shareQueue.length; i++) {
        if(_paymentSerNo == shareQueue[i]) {
            delete shareQueue[i];
            break;
        }
    }
  }

  function enPrivateQueue(bytes32 _paymentSerNo) internal {
    privateQueue.push(_paymentSerNo);
  }

  function dePrivateQueue(bytes32 _paymentSerNo) internal {
    for(uint i=0; i< privateQueue.length; i++) {
        if(_paymentSerNo == privateQueue[i]) {
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


  function getPaymentListLength() constant returns(uint) {
      return paymentIdx.length;
  }

  function getPaymentList(uint index) constant returns(bytes32) {
      return paymentIdx[index];
  }

  function getPaymentInfo(bytes32 _paymentSerNo) constant returns(bytes32, bytes32 , bytes32 , bytes32 , int , uint, bytes32, bytes32) {
    Payment this_payment = Payments[_paymentSerNo];
    return(this_payment.from_bank_id, this_payment.from_customer_id,
                                             this_payment.to_bank_id, this_payment.to_customer_id,
                                             this_payment.payment, this_payment.timestamp, this_payment.digest,
                                             this_payment.rev_paymentSerNo
                                             );
  }

  function getPaymentDigest(bytes32 _paymentSerNo) constant returns(bytes32) {
    Payment this_payment = Payments[_paymentSerNo];
    return(this_payment.digest);
  }

  function getPaymentTimeout(bytes32 _paymentSerNo) constant returns(uint) {
    Payment this_payment = Payments[_paymentSerNo];
    return(this_payment.timeout);
  }

  function getPaymentHash(bytes32 _paymentSerNo) constant returns(bytes32) {
    Payment this_payment = Payments[_paymentSerNo];
    return(this_payment.paymentHash);
  }

  function getPaymentState(bytes32 _paymentSerNo) constant returns(uint, int) {
    Payment this_payment = Payments[_paymentSerNo];
    return(uint(this_payment.state), this_payment.return_code);
  }

}
