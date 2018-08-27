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

// 注意Owner為央行
contract SecuritiesInterest is Owned {

  uint securities_cnt;

  struct securities {
      bytes32 [] securities;
      mapping(bytes32 => securities_paydates) paydateSet; // 以securities_id為index
      mapping(bytes32 => bool) hasSecurities;
  }

  struct securities_paydates {
      uint [] paydates;  // 付息日 timestamp 陣列
      uint paydates_cnt;
      mapping(uint => bool) shouldPayInterest;   // 付息日->是否已付息
      mapping(uint => bool) hasPaydate;
  }

  securities private securitiesSet;

  function SecuritiesInterest() {
  }

  event EventForSetInterestsPaydates(bytes32 _securities_id);
  event EventSetShouldPayInterest(bytes32 _securities_id, uint _paydate, bool _hasPaidInterest);

  function setInterestsPaydates(bytes32 _securities_id, uint _paydateCnt, uint _serno, uint _paydate1, uint _paydate2,
                                uint _paydate3, uint _paydate4, uint _paydate5, uint _paydate6,
                                uint _paydate7) onlyOwner {

     if(!securitiesSet.hasSecurities[_securities_id]) {
         securitiesSet.securities.push(_securities_id);
         securitiesSet.hasSecurities[_securities_id] = true;
         securities_cnt++;
     }else {
         if(_serno == 1) {
             // 重覆發行，清除前面設定的日期
             for(uint x=0; x< securitiesSet.paydateSet[_securities_id].paydates_cnt ; x++) {
                 delete(securitiesSet.paydateSet[_securities_id].paydates[x]);
                 securitiesSet.paydateSet[_securities_id].hasPaydate[paydate_list[i]] = false;
                 securitiesSet.paydateSet[_securities_id].shouldPayInterest[paydate_list[i]] = false;
             }
             securitiesSet.paydateSet[_securities_id].paydates.length = 0;
             securitiesSet.paydateSet[_securities_id].paydates_cnt = 0;
         }
     }

     uint [] paydate_list;

     paydate_list[0] = _paydate1;
     paydate_list[1] = _paydate2;
     paydate_list[2] = _paydate3;
     paydate_list[3] = _paydate4;
     paydate_list[4] = _paydate5;

     paydate_list[5] = _paydate6;
     paydate_list[6] = _paydate7;
//     paydate_list[7] = _paydate8;
//     paydate_list[8] = _paydate9;
//     paydate_list[9] = _paydate10;

     for(uint i=0; i< _paydateCnt; i++) {
        securitiesSet.paydateSet[_securities_id].paydates_cnt++;
        securitiesSet.paydateSet[_securities_id].paydates.push(paydate_list[i]);
        securitiesSet.paydateSet[_securities_id].hasPaydate[paydate_list[i]] = true;
        securitiesSet.paydateSet[_securities_id].shouldPayInterest[paydate_list[i]] = true;
     }

     EventForSetInterestsPaydates(_securities_id);

  }

  function checkInterestsPaydates(bytes32 _securities_id, uint _paydate)  constant returns(bool) {
     return securitiesSet.paydateSet[_securities_id].hasPaydate[_paydate];
  }

  function shouldPayInterest(bytes32 _securities_id, uint _paydate)  constant returns(bool) {
     return securitiesSet.paydateSet[_securities_id].shouldPayInterest[_paydate];
  }

  function setShouldPayInterest(bytes32 _securities_id, uint _paydate, bool _hasPaidInterest) onlyOwner {
     securitiesSet.paydateSet[_securities_id].shouldPayInterest[_paydate] = _hasPaidInterest;
     EventSetShouldPayInterest(_securities_id, _paydate, _hasPaidInterest);
  }

  function getPayDatesListLength(bytes32 _securities_id) constant returns (uint) {
     return  securitiesSet.paydateSet[_securities_id].paydates_cnt;
  }

  function getPayDatesList(bytes32 _securities_id, uint index) constant returns (uint) {
     return  securitiesSet.paydateSet[_securities_id].paydates[index];
  }


}
