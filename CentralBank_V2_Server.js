var Http = require( 'http' ),
    Router = require( 'router' ),
    server,
    router;
router = new Router();

var BodyParser = require('body-parser');
var Promise = require('promise');
var cors = require('cors');
var contractAbi = require('./ContractABI');

var events = require('events');

var esc_red_str = "\\033[0;31m ***" + new Date().getTime();
var esc_red_end = "\\033[0m";


var MongoClient = require('mongodb').MongoClient;
var MongoDB_URI = "mongodb://localhost:27017";
var dbConnection;

// To reduce the number of connection pools created by your application,
// we recommend calling MongoClient.connect once and reusing the database variable returned by the callback:
MongoClient.connect(MongoDB_URI, function (err, db) {
    if (err) throw err;
    dbConnection = db.db("centralbank");
    console.log("mongodb connected")

    initCache();

});


var Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:22000'));
var eth = web3.eth;

var web3_v2 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
var eth_v2 = web3_v2.eth;

var TransactionMatcherContract = web3.eth.contract(contractAbi.TransactionMatcherAbi);
var TransactionMatcher = TransactionMatcherContract.at(contractAbi.TransactionMatcherAddress);

var PaymentMatcherContract = web3_v2.eth.contract(contractAbi.PaymentMatcherAbi);
var PaymentMatcher = PaymentMatcherContract.at(contractAbi.PaymentMatcherAddress);


var BankContract = web3.eth.contract(contractAbi.BankAbi);

var SecuritiesInterestContract = web3.eth.contract(contractAbi.SecuritiesInterestAbi);
var SecuritiesInterest = SecuritiesInterestContract.at(contractAbi.SecuritiesInterestAddress);

var CB_admin = '0xed9d02e382b34818e88b88a309c7fe71e65f419d';

var key_Bank1 = "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo="
var key_Bank2 = "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc="
var key_Bank3 = "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg="
var key_Bank4 = "oNspPPgszVUFw0qmGFfWwh1uxVUXgvBxleXORHj07g8="
var key_Bank5 = "R56gy4dn24YOjwyesTczYa8m5xhP6hF2uTMCju/1xkY="
var key_Bank6 = "UfNSeSGySeKg11DVNEnqrUtxYRVor4+CvluI8tVv62Y="
var key_Bank7 = "ROAZBWtSacxXQrOe3FGAqJDyJjFePR5ce4TSIzmJ0Bc="


var CB_Error_Simulate_Flag = "N";   // 同資錯誤旗標
// var MONGO_LOCK = "F";

var Bank2_Balance;  // Cache 不用每次都去讀DB
var Bank4_Balance;
var Bank5_Balance;


if(web3.isConnected()) {

    console.log('connected to quorum enode [node2:22000], starting event listening ...');

    var event1 = TransactionMatcher.EventForSecuritiesTransactionWaitingForPayment({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event1.watch(function(error, event){
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+new Date().getTime()+"交易序號："+ret0+" EventForSecuritiesTransactionWaitingForPayment"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );
            console.log(esc_red_str+new Date().getTime()+"交易序號："+ret1+" EventForSecuritiesTransactionWaitingForPayment"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            //var from_bank = ret0.substr(0,5);
            //var to_bank = ret1.substr(0,5);

            var from_bank;
            var to_bank;

            if(ret0.substr(5,1) == "S") {
                from_bank = ret0.substr(0,5);
                to_bank = ret1.substr(0,5);
            }else if(ret1.substr(5,1) == "S") {
                to_bank = ret0.substr(0,5);
                from_bank = ret1.substr(0,5);
            }

            //insertUpdateTxn( txnseq , status, ret_code)

            insertUpdateTxn(s0, "Waiting4Payment", "0" , "", txhash, blocknum);
            insertUpdateTxn(s1, "Waiting4Payment", "0" , "", txhash, blocknum);


            if(CB_Error_Simulate_Flag=="EZ") {
                console.log("跨鏈模式，同資不做款項處理。");
                return;
            }


            var _bank_balance = parseInt(eval(to_bank+"_Balance"));

            console.log("from_bank =" + from_bank);
            console.log("to_bank =" + to_bank);
            console.log("Bank_Balance =" + _bank_balance);

            /*
            async.auto(
                {
                    first: function (insertUpdateTxn) {
                        insertUpdateTxn(s0, "Waiting4Payment", 0, txhash, blocknum);
                    },
                    second: ['first', function (results, insertUpdateTxn) {
                        insertUpdateTxn(s1, "Waiting4Payment", 0, txhash, blocknum);
                    }],
                },
                function (err, results) {
                    console.log("result of executing all function",results)

                }
            );
            */

            // var acct = ret4.replace(/[^0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '') ;

            //redis_client.set(ret0,'M');
            //redis_client.persist(ret0);
            //settleInterBankTransaction(bytes32 _txSerNo1, bytes32 _txSerNo2, int _cb_return_code, bool _isNettingSuccess)

            var fields = TransactionMatcher.getTransactionInfo(ret0);
            var payment  = parseInt(fields[6]);

            console.log("payment " + payment);

            var isPaymentShortage = false;

            if(_bank_balance < payment) {
                isPaymentShortage = true;

                console.log("同資餘額不足")
            }

            if(CB_Error_Simulate_Flag!="E1" && CB_Error_Simulate_Flag!="E2" && CB_Error_Simulate_Flag!="E3" && CB_Error_Simulate_Flag!="EZ" &&
                isPaymentShortage == false) {
                var txHashA = TransactionMatcher.settleInterBankTransaction(ret0, ret1, 0, true, {
                        from: CB_admin,
                        gas: 6000000,
                        privateFor: [
                            //key_Bank1,
                            eval('key_' + from_bank),
                            eval('key_' + to_bank)
                            //key_Bank6
                        ]
                    }, function (err, txhash) {
                        if (!err) {
                            console.log("正常執行")
                            console.log(txhash);
                        } else {
                            console.log(err);
                        }

                        //response.end(txnseq);
                    }
                );

            } else if (CB_Error_Simulate_Flag=="E3") {   // 模擬同資錯誤 (系統錯誤)
                var txHashA = TransactionMatcher.settleInterBankTransaction(ret0, ret1, 500 , false, {
                        from: CB_admin,
                        gas: 6000000,
                        privateFor: [
                            //key_Bank1,
                            eval('key_' + from_bank),
                            eval('key_' + to_bank)
                            //key_Bank6
                        ]
                    }, function (err, txhash) {
                        if (!err) {
                            console.log(txhash);
                        } else {
                            console.log(err);
                        }

                        //response.end(txnseq);
                    }
                );
            } else if (CB_Error_Simulate_Flag=="E1") {   // 模擬同資錯誤 （等待但無錯誤訊息）
                var txHashA = TransactionMatcher.settleInterBankTransaction(ret0, ret1, 100 , false, {
                        from: CB_admin,
                        gas: 6000000,
                        privateFor: [
                            //key_Bank1,
                            eval('key_' + from_bank),
                            eval('key_' + to_bank)
                            //key_Bank6
                        ]
                    }, function (err, txhash) {
                        if (!err) {
                            console.log(txhash);
                        } else {
                            console.log(err);
                        }

                        //response.end(txnseq);
                    }
                );
            } else if (CB_Error_Simulate_Flag=="E2" || isPaymentShortage) {   // 模擬同資錯誤 （等待且有訊息）
                var txHashA = TransactionMatcher.settleInterBankTransaction(ret0, ret1, 200 , false, {
                        from: CB_admin,
                        gas: 6000000,
                        privateFor: [
                            //key_Bank1,
                            eval('key_' + from_bank),
                            eval('key_' + to_bank)
                            //key_Bank6
                        ]
                    }, function (err, txhash) {
                        if (!err) {
                            console.log(txhash);
                        } else {
                            console.log(err);
                        }

                        //response.end(txnseq);
                    }
                );

                insertFailedTransactionPair(ret0, ret1, from_bank, to_bank, payment);

            }

        }
    });

    var event2 = TransactionMatcher.EventForSecuritiesTransactionFinished({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event2.watch(function(error, event){
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;


            console.log(esc_red_str+new Date().getTime()+"交易序號："+s0+" "+s1+" EventForSecuritiesTransactionFinished"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            //redis_client.set(ret0,'F');
            //redis_client.persist(ret0);
            //console.log('set {'+ ret0 + ",F}");

            insertUpdateTxn(s0, "Finished", "0" , "",txhash, blocknum);
            insertUpdateTxn(s1, "Finished", "0" , "",txhash, blocknum);


            var fields = TransactionMatcher.getTransactionInfo(ret0);
            var from_bank = web3.toAscii(fields[0]);
            var to_bank = web3.toAscii(fields[2]);
            var payment  = parseInt(fields[6]);

            from_bank = from_bank.substr(0,5);
            to_bank = to_bank.substr(0,5);

            if(from_bank != to_bank) {   // 自行交易不扣同資款
                insertUpdateBankBalance(from_bank, payment,false);
                insertUpdateBankBalance(to_bank, payment * -1,false);
            }

            deleteFailedTransactionPair(ret0);

            /*
            async.auto(
                {
                    first: function (insertUpdateTxn) {
                        insertUpdateTxn(s0, "Finished", 0, txhash, blocknum);
                    },
                    second: ['first', function (results, insertUpdateTxn) {
                        insertUpdateTxn(s1, "Finished", 0, txhash, blocknum);
                    }],
                },
                function (err, results) {
                    console.log("result of executing all function",results)

                }
            );
            */

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");
                exec('/Applications/NotifySuccess.app/Contents/MacOS/applet', function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();


        }
    });

    var event3 = TransactionMatcher.EventForSecuritiesTransactionPaymentError({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event3.watch(function(error, event){
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var ret2 = event.args.rc;
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+new Date().getTime()+"交易序號："+s0+" "+s1+" EventForSecuritiesTransactionPaymentError"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            //redis_client.set(ret0,'F');
            //redis_client.persist(ret0);
            //console.log('set {'+ ret0 + ",F}");

            if(ret2 == "500") {
                insertUpdateTxn(s0, "Cancelled", ret2, "同資系統錯誤", txhash, blocknum);
                insertUpdateTxn(s1, "Cancelled", ret2, "同資系統錯誤", txhash, blocknum);
            }else if(ret2 == "100") {
                insertUpdateTxn(s0, "Waiting4Payment", ret2, "", txhash, blocknum);  // 隱藏理由
                insertUpdateTxn(s1, "Waiting4Payment", ret2, "", txhash, blocknum);  // 隱藏理由
            }else if(ret2 == "200") {
                insertUpdateTxn(s0, "Waiting4Payment", ret2, "同資款項不足", txhash, blocknum);
                insertUpdateTxn(s1, "Waiting4Payment", ret2, "同資款項不足", txhash, blocknum);
            }else {
                insertUpdateTxn(s0, "Waiting4Payment", ret2, "同資錯誤", txhash, blocknum);
                insertUpdateTxn(s1, "Waiting4Payment", ret2, "同資錯誤", txhash, blocknum);
            }

            /*
            async.auto(
                {
                    first: function (insertUpdateTxn) {
                        insertUpdateTxn(s0, "PaymentError", 0, txhash, blocknum);
                    },
                    second: ['first', function (results, insertUpdateTxn) {
                        insertUpdateTxn(s1, "PaymentError", 0, txhash, blocknum);
                    }],
                },
                function (err, results) {
                    console.log("result of executing all function",results)

                }
            );
            */

        }
    });


    var event4 = TransactionMatcher.EventForSecuritiesTransactionCancelled({some: "_txSerNo"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event4.watch(function (err, event) {
        if (!err) {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo);
            var retA = event.args.rc;
            var retB = event.args._reason;
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+new Date().getTime()+"交易序號："+s0+" EventForSecuritiesTransactionCancelled"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            insertUpdateTxn(s0, "Cancelled", retA, retB, txhash, blocknum);

            deleteFailedTransactionPair(ret0);

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");
                exec('/Applications/NotifyCancelled.app/Contents/MacOS/applet', function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();


        } else {
            console.log(err);
            //response.end("SENDTXN_ERR");
        }
    });


    //event EventForSecuritiesTransactionPending(bytes32 _txSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id, bytes32 _to_bank_id, bytes32 _to_customer_id,
    //               int _securities_amount, bytes32 _securities_id, int _payment, uint _timestamp, bytes32 _digest, address _sender);
    var event5 = TransactionMatcher.EventForSecuritiesTransactionPending({some: "_txSerNo"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event5.watch(function (err, event) {
        if (!err) {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+new Date().getTime()+"交易序號："+ s0 + " submitInterBankTransaction ，is Pending" + esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );
            //redis_client.set(ret0,'P');
            //redis_client.persist(ret0);
            //console.log('set {'+ ret0 + ",P}");

            insertUpdateTxn(s0, "Pending", "99" , "尚未比對", txhash, blocknum);

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");
                exec('/Applications/NotifyPending.app/Contents/MacOS/applet', function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();

        } else {
            console.log(err);
            //response.end("SENDTXN_ERR");
        }
    });



}else {
    console.log('connect to enode [node2:22000] failed');
    return;
}

server = Http.createServer( function( request, response ) {
    router( request, response, function( error ) {
        if ( !error ) {
            response.writeHead( 404 );
        } else {
            // Handle errors
            console.log( error.message, error.stack );
            response.writeHead( 400 );
        }
        response.end( 'CB RESTful API is running!' );
    });
});

server.listen( 3000, function() {
    console.log( 'Listening on port 3000' );
});



router.use( BodyParser.text() );
router.use( cors() );

// submitInterBankTransaction(bytes32 _txSerNo, bytes32 _from_broker_id, bytes32 _from_customer_id,
// bytes32 _to_broker_id, bytes32 _to_customer_id, int _securities_amount, bytes32 _securities_id,
//    int _payment, bytes32 _digest)
/*
router.get( '/checkTxnInfo/CB/:txnseq', function (request, response) {

    var txnseq = request.params.txnseq;

    //console.log(web3.isAddress(to_bank_add));

    console.log("/checkTxnInfo/CB/:checkTxnInfo " + txnseq);

    var fields = TransactionMatcher.getTransactionInfo(txnseq);


    //return(this_txn.from_broker_id, this_txn.from_customer_id,
    //this_txn.to_broker_id, this_txn.to_customer_id,
    //    this_txn.securities_amount, this_txn.securities_id, this_txn.payment, this_txn.timestamp
    //);


    var from_broker = fields[0]
    var from_customer = fields[1]
    var to_broker = fields[2]
    var to_customer = fields[3]
    var securities_amount = fields[4]
    var securities_id  = fields[5]
    var payment  = fields[6]
    var timestamp  = fields[7]

    var d = new Date();
    var s_time = new Date(timestamp * 1000 + d.getTimezoneOffset() * 60000)

    console.log(
        ' from_broker : ' + from_broker + '\n' +
        ' from_customer : ' + from_customer + '\n' +
        ' to_broker : ' + to_broker + '\n' +
        ' to_customer : ' + to_customer + '\n' +
        ' securities_amount : ' + securities_amount + '\n' +
        ' securities_id : ' + securities_id + '\n' +
        ' payment : ' + payment + '\n' +
        ' timestamp :' + timestamp +'\n'
       );

    var fields_2 = TransactionMatcher.getTransactionState(txnseq);

    console.log(fields_2);
});
*/

var emitter = new events.EventEmitter();
emitter.on('depositCBEvent', function(arg1) {

    console.log('depositCBEvent', arg1);

    settleFailedTransaction(arg1);

});


router.get( '/unlockAccount/:passwd/:period', function (request, response) {
    var _passwd = request.params.passwd;
    var _period = parseInt(request.params.period);

    if(_passwd == "password") {
        _passwd = "";
    }

    var isUnlocked = web3.personal.unlockAccount(CB_admin, _passwd, _period);

    if(isUnlocked) {
        console.log("解鎖成功");
        response.end("解鎖成功");
    }else {
        console.log("解鎖失敗");
        response.end("解鎖失敗");
    }
});

router.get( '/lockAccount', function (request, response) {
    web3.personal.lockAccount(CB_admin);
    console.log("lockAccount");
    response.end("OK");
});


router.get( '/registerBank/:bank_id/:bank_address', function(request, response) {

    var _bank_id = request.params.bank_id;
    var _bank_address = request.params.bank_address;

    console.log("registerBank "+ _bank_id + " " + _bank_address)

    var txHashA = TransactionMatcher.createBank(_bank_id,  _bank_address, {
            from: CB_admin,
            gas: 6000000,
            privateFor: [
                key_Bank2,
                //key_Bank3,
                key_Bank4,
                key_Bank5,
                //key_Bank6,
                //key_Bank7,
            ]
        }, function (err, txhash) {
            if (!err) {
                var theEvent = TransactionMatcher.EventForCreateBank({
                    from: CB_admin,
                });
                theEvent.watch(function (err, event) {
                    if (!err) {
                        theEvent.stopWatching();
                        var ret0 = web3.toAscii(event.args._bank_id);
                        console.log("註冊清算銀行完成"+ret0);
                        //response.end(ret0);

                        console.log("setBankOwnerShip"+ _bank_id)


                        var txHashS = TransactionMatcher.setOwnedNode(_bank_id, true, {
                                from: CB_admin,
                                gas: 6000000,
                                privateFor: [
                                    eval('key_' + _bank_id),
                                ]
                            }, function (err, txhash) {
                                if (!err) {
                                    var theEvent2 = TransactionMatcher.EventForSetOwnedNode({
                                        from: CB_admin,
                                    });
                                    theEvent2.watch(function (err, event) {
                                        var ret0 = web3.toAscii(event.args._bank_id);
                                        if (!err) {
                                            theEvent2.stopWatching();
                                            console.log("設定清算銀行完成"+ret0);
                                            response.end(ret0);
                                        } else {
                                            console.log('設定清算銀行失敗');
                                            response.end("ERROR");
                                        }
                                    });

                                } else {
                                    console.log('設定清算銀行失敗');
                                    response.end("ERROR");
                                }

                            }
                        );


                    } else {
                        console.log('註冊清算銀行失敗');
                        response.end("ERROR");
                    }
                });
            } else {
                console.log('註冊清算銀行失敗');
                response.end("ERROR");
            }
        }
    );

});

router.get( '/registerBank2/:bank_id/:bank_address', function(request, response) {

    var _bank_id = request.params.bank_id;
    var _bank_address = request.params.bank_address;

    console.log("registerBank2 [款鏈] "+ _bank_id + " " + _bank_address)

    var txHashA = PaymentMatcher.createCashBank(_bank_id,  _bank_address, {
            from: eth_v2.accounts[0],
            gas: 3000000,
            /*
            privateFor: [
                key_Bank2,
                key_Bank3,
                key_Bank4,
                key_Bank5,
                key_Bank6,
                key_Bank7,
            ]
            */
        }, function (err, txhash) {
            if (!err) {
                var theEvent = PaymentMatcher.EventForCreateCashBank({
                    from: eth_v2.accounts[0],
                });
                theEvent.watch(function (err, event) {
                    if (!err) {
                        theEvent.stopWatching();
                        var ret0 = web3_v2.toAscii(event.args._bank_id);
                        console.log("註冊款鏈清算銀行完成"+ret0);

                        console.log("setBankOwnerShip"+ _bank_id)

                        var txHashS = PaymentMatcher.setOwnedNode(_bank_id, true, {
                                from: eth_v2.accounts[0],
                                gas: 3000000,
                            }, function (err, txhash) {
                                if (!err) {
                                    var theEvent2 = PaymentMatcher.EventForSetOwnedNode({
                                        from: eth_v2.accounts[0],
                                    });
                                    theEvent2.watch(function (err, event) {
                                        var ret0 = web3.toAscii(event.args._bank_id);
                                        if (!err) {
                                            theEvent2.stopWatching();
                                            console.log("設定清算銀行完成"+ret0);
                                            response.end(ret0);
                                        } else {
                                            console.log('設定清算銀行失敗');
                                            response.end("ERROR");
                                        }
                                    });

                                } else {
                                    console.log('設定清算銀行失敗');
                                    response.end("ERROR");
                                }

                            }
                        );

                    } else {
                        console.log('註冊款鏈清算銀行失敗');
                        response.end("ERROR");
                    }
                });
            } else {
                console.log('註冊款鏈清算銀行失敗');
                response.end("ERROR");
            }
        }
    );

});



router.get( '/setCBErrorSimulate/:isError', function(request, response) {

     var _flag = request.params.isError;

    CB_Error_Simulate_Flag = _flag;

    console.log("setCBErrorSimulate"+ CB_Error_Simulate_Flag)

    response.end("SUCCESS");

});


router.get( '/depositCBBalance/:bank/:payment', function(request, response) {

    var _bank = request.params.bank;
    var _payment = parseInt(request.params.payment);

    console.log("depositCBBalance "+_bank+" "+_payment)

    insertUpdateBankBalance(_bank, _payment,true);

    /*
    var txn = new BankBalance ( _bank, _balance);

    dbConnection.collection("bankbalance").find({"bank": _bank}).toArray(function(err, result) {
        if (err) throw err;
        //console.log(JSON.stringify(result));
        if(result.length == 0) {
            dbConnection.collection("bankbalance").insertOne(txn, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 bankbalance document inserted");
                settleFailedTransaction(bank);
            });

        } else {
            var myquery = { bank: _bank };

            var old_balance = parseInt(result["balance"]);
            var new_balance = old_balance + _balance;

            var newvalues;

            newvalues = { $set: { balance: new_balance } };

            console.log(myquery);
            console.log(newvalues);

            dbConnection.collection("bankbalance").updateOne(myquery, newvalues, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 bankbalance document updated");
                settleFailedTransaction(bank);
            });
        }
    });
    */

    //emitter.emit('depositCBEvent', _bank);

    response.end("SUCCESS");

});


router.get( '/settleFailedTransaction/:bank', function(request, response) {


    var _bank = request.params.bank;
    console.log("settleFailedTransaction"+_bank);

    settleFailedTransaction(_bank);

    response.end("END");

});


function settleFailedTransaction(_bank) {

    _bank = _bank.substr(0,5);

    var qryStr = '{ "to_bank" : "' + _bank + '" }';

    dbConnection.collection("failtxns").find(qryStr).sort({ "payment" : 1 }).toArray( function(err,res){

        if(err) return;

        //var bank_balance = queryBankBalance(_bank);

        var bank_balance = parseInt(eval(_bank + "_Balance"));

        console.log(bank_balance);

        for (var i = 0; i < res.length; i++) {

            var _payment = parseInt(res[i]["payment"]);
            var _txn1 = res[i]["txnseq1"];
            var _txn2 = res[i]["txnseq2"];
            var _from_bank = res[i]["from_bank"];
            var _to_bank = res[i]["to_bank"];

            console.log(_payment);

            if (_payment <= bank_balance) {

                var txHashA = TransactionMatcher.settleInterBankTransaction(_txn1, _txn2, 0, true, {
                        from: CB_admin,
                        gas: 6000000,
                        privateFor: [
                        //key_Bank1,
                            eval('key_' + _from_bank),
                            eval('key_' + _to_bank)
                        //key_Bank6
                        ]
                    }, function (err, txhash) {
                        if (!err) {
                            console.log(txhash);
                        } else {
                            console.log(err);
                        }
                    //response.end(txnseq);
                    }
                );

                bank_balance -= _payment;

            } else {

                console.log("餘額不足");
                break;
            }
        }
    });

}


router.get( '/checkCBBalance/:bank', function(request, response) {

    var _bank = request.params.bank;

    //var _balance = queryBankBalance(_bank);

    var result = dbConnection.collection("bankbalance").find({"bank": _bank}).toArray(function(err, result) {

        if (err) throw err;

        //console.log("result "+result);
        var _balance = result[0]["balance"] + "";
        console.log("queryCBBalance "+ _bank + " " + _balance);
        response.end(_balance);
    });

});


//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,
router.get( '/issueSecurities/:securities_id/:amount/:interest_rateX10K/:start_tm/:end_tm/:period', function(request, response) {

    var _securities_id = request.params.securities_id;
    var _amount = request.params.amount;
    // var _unit_price = request.params.unit_price;
    var _interest_rateX10K = request.params.interest_rateX10K;
    var _start_tm = request.params.start_tm;
    var _end_tm = request.params.end_tm;
    var _period = request.params.period;

    console.log("issueSecurities:"+_securities_id);

    //function issueSecurities(bytes32 _securities_id, int _amount, int unit_price, int _interest_rateX10K, int _start_tm, int _end_tm, int _period) onlyOwner{
    var txHashA = TransactionMatcher.issueSecurities( _securities_id,  _amount, _interest_rateX10K,  _start_tm,  _end_tm,  _period,  {
            from: CB_admin,
            gas: 6000000,
            privateFor: [
                key_Bank2,
                //key_Bank3,
                key_Bank4,
                key_Bank5,
                //key_Bank6,
                //key_Bank7
            ]
        }, function (err, txhash) {
            if (!err) {
                var theEvent = TransactionMatcher.EventForIssueSecurities({
                    from: CB_admin,
                });
                theEvent.watch(function (err, event) {
                    if (!err) {
                        theEvent.stopWatching();
                        var ret0 = web3.toAscii(event.args._securities_id);
                        console.log("發行央行公債交易完成"+ret0);
                        response.end(ret0);
                    } else {
                        console.log("發行央行公債交易失敗");
                        response.end("ERROR");
                    }
                });
            } else {
                console.log("發行央行公債交易失敗");
                response.end("ERROR");
            }
        }
    );


});

//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,
router.get( '/setSecuritiesInterestPayDate/:securities_id/:start_tm/:period', function(request, response) {

    var _securities_id = request.params.securities_id;
    var _start_tm = request.params.start_tm;
    var _period = parseInt(request.params.period);

    console.log("setSecuritiesInterestPayDate:"+_securities_id+" "+_start_tm+" "+_period);

    var _pay_dates = [] ;

    var date = new Date(_start_tm * 1000);

    var _year = date.getFullYear();
    var _month = parseInt(date.getMonth()) + 1;
    var _day = date.getDate();

    for(var i=0; i< _period; i++) {
        var _newyear = parseInt(_year)+i+1;
        var _tdates = _newyear + "-" + _month + "-" + _day + " 00:00:00";
        console.log(_tdates);
        var _ts = Math.round(new Date(_tdates).getTime()/1000)
        _pay_dates.push(_ts);
    }

    var cnt = _period;
    var batch_serno = 0;

    for(var j=0; j<_period; j+=7) {

        var parm_cnt = 0;

        if(cnt > 7) {
            parm_cnt = 7;
            cnt -= 7;
        }else if(cnt < 7) {
            parm_cnt = cnt % 7;
            for (var k = parm_cnt ; k < 7; k++) {
                _pay_dates[j+k] = 0; // 設定其餘的元素為0，避免undefined
            }
        }

        batch_serno++;

        console.log(parm_cnt + " " + batch_serno + " " +_pay_dates[j]+" "+_pay_dates[j+1]+" "+_pay_dates[j+2]+" "+_pay_dates[j+3]+" "+
            _pay_dates[j+4]+" "+_pay_dates[j+5]+" "+_pay_dates[j+6]); //+" "+_pay_dates[j+7]+" "+_pay_dates[j+8]);

        //function issueSecurities(bytes32 _securities_id, int _amount, int unit_price, int _interest_rateX10K, int _start_tm, int _end_tm, int _period) onlyOwner{
        var txHashA = SecuritiesInterest.setInterestsPaydates(_securities_id, parm_cnt, batch_serno, _pay_dates[j], _pay_dates[j+1], _pay_dates[j+2], _pay_dates[j+3],
                                                        _pay_dates[j+4], _pay_dates[j+5], _pay_dates[j+6], {
                from: CB_admin,
                gas: 6000000,
                privateFor: [
                    //key_Bank2,
                    //key_Bank3,
                    //key_Bank4,
                    //key_Bank5,
                    //key_Bank6,
                    //key_Bank7
                ]
            }, function (err, txhash) {
                if (!err) {
                    var theEvent = SecuritiesInterest.EventForSetInterestsPaydates({
                        from: CB_admin,
                    });
                    theEvent.watch(function (err, event) {
                        if (!err) {
                            theEvent.stopWatching();
                            var ret0 = web3.toAscii(event.args._securities_id);
                            console.log("設定央行公債計息日：" + ret0);
                            response.end(ret0);
                        } else {
                            console.log("設定央行公債計息日失敗");
                            response.end("ERROR");
                        }
                    });
                } else {
                    console.log("設定央行公債計息日交易失敗");
                    response.end("ERROR");
                }
            }
        );
    }

});



//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,
router.get( '/registerSecurities/:securities_id/:bank_id/:customer_id/:amount/:is_increase', function(request, response) {

    var _securities_id = request.params.securities_id;
    var _bank_id = request.params.bank_id;
    var _customer_id = request.params.customer_id;
    var _amount = request.params.amount;
    var _is_inc = request.params.is_increase;
    var _is_increase = true;

    if ( _is_inc == 'N' ) {
        _is_increase = false;
    }

    var txHashA = TransactionMatcher.registerCustomerOwnedSecuritiesAmount(_securities_id, _bank_id, _customer_id, _amount, _is_increase,  {
            from: CB_admin,
            gas: 7000000,
            privateFor: [
                eval('key_' + _bank_id),
                /*
                key_Bank2,
                key_Bank3,
                key_Bank4,
                key_Bank5,
                key_Bank6,
                key_Bank7
                */
            ]
        }, function (err, txhash) {
            if (!err) {
                var theEvent = TransactionMatcher.EventForRegisterCustomerOwnedSecuritiesAmount({
                    from: CB_admin,
                });
                theEvent.watch(function (err, event) {
                    if (!err) {
                        theEvent.stopWatching();
                        var ret0 = web3.toAscii(event.args._securities_id);
                        console.log("央行登錄公債交易完成");
                        response.end(ret0);
                    } else {
                        console.log("央行登錄公債交易失敗");
                        response.end("ERROR");
                    }
                });
            } else {
                console.log("央行登錄公債交易失敗");
            }
        }
    );

});


//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,
router.get( '/matchTransactions/:txn1/:txn2/:bank1/:bank2', function(request, response) {

    var _txn1 = request.params.txn1;
    var _txn2 = request.params.txn2;
    var _bank1 = request.params.bank1;
    var _bank2 = request.params.bank2;

    TransactionMatcher.settleInterBankTransaction( _txn1, _txn2, 0 , true, {
        from: CB_admin,
        gas: 6000000,
        privateFor: [
            eval('key_' + _bank1),
            eval('key_' + _bank2)
        ]
    }, function (err, txhash) {
        if (!err) {
            var theEvent = TransactionMatcher.EventForSecuritiesTransactionFinished({
                from: CB_admin,
            });
            theEvent.watch(function (err, event) {
                if (!err) {
                    theEvent.stopWatching();

                    //console.log(event.event + ": " + JSON.stringify(event.args));
                    var ret0 = web3.toAscii(event.args._txSerNo1);
                    var ret1 = web3.toAscii(event.args._txSerNo2);
                    //console.log("交易序號："+ret0+"Bank2 TransferTo 成功");
                    console.log('公債交易比對完成，交易序號一：'+ ret0 + "，交易序號二：" + ret1);
                    response.end(ret0 + " " + ret1);
                } else {
                    console.log('比對央行公債交易失敗');
                    response.end("ERROR");
                }
            });
        } else {
            console.log('比對央行公債交易失敗');
            response.end("ERROR");
        }
    });

});


//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,
router.get( '/cancelTransactions/:from_bank/:to_bank/:txn/:txnstate', function(request, response) {

    var _txn = request.params.txn;
    var _from_bank = request.params.from_bank;
    var _to_bank = request.params.to_bank;
    var _txnstate = request.params.txnstate;

    var _rc;
    var _reason = "";

    if(_txn.charAt(5) == "S") {
        _rc = 5;
    }else {
        _rc = 6;
    }if(_txnstate == "Waiting4Payment" && CB_Error_Simulate_Flag == "E2") {
        _reason = "SOM";
    }

    console.log("cancel rc = " + _rc);

    TransactionMatcher.submitSetTransactionCancelled(_txn, "", _rc , _reason ,{
        from: CB_admin,
        gas: 6000000,
        privateFor: [
            eval('key_' + _from_bank),
            eval('key_' + _to_bank)
        ]
    }, function (err, txhash) {
        if (!err) {
            var theEvent = TransactionMatcher.EventForSecuritiesTransactionCancelled({
                from: CB_admin,
            });
            theEvent.watch(function (err, event) {
                if (!err) {
                    theEvent.stopWatching();
                    var ret0 = web3.toAscii(event.args._txSerNo);
                    console.log('公債交易取消完成，交易序號：'+ ret0 );
                    response.end(ret0);

                    if(CB_Error_Simulate_Flag == "EZ") {
                        var txHashB = PaymentMatcher.submitSetPaymentCancelled(ret0, "", _rc, "", {
                            from: eth_v2.accounts[0],
                            gas: 3000000,
                            /*
                            privateFor: [
                                key_Bank1,
                                eval('key_' + participant)
                            ]
                            */
                        }, function (err, txhash) {
                            if (!err) {
                                console.log('公債交易取消完成(款鏈)');
//                            deletePaymentSecret(txn);
                                response.end("SUCCESS");
                            } else {
                                console.log(err);
                                response.end("ERROR");
                            }
                        });
                    }
                } else {
                    console.log('公債交易取消失敗');
                    response.end("ERROR");
                }
            });
        } else {
            console.log('公債交易取消失敗');
            response.end("ERROR");
        }
    });

});


router.get('/calcInterest/:sec/:bank/:date', function(request, response) {

    var _pick_sec = request.params.sec;
    var _pick_date = request.params.date;
    var _pick_bank = request.params.bank;

    if(_pick_sec=="NA") _pick_sec = "";
    if(_pick_date=="NA") _pick_date = "";
    if(_pick_bank=="NA") _pick_bank = "";


    console.log("calcInterest/"+_pick_sec+"/"+_pick_bank+"/"+_pick_date);

    var _period = 1; // hard-coded

    var interest_array = [[]];

    var htmlstr = "<table class=\"table\"><thead><tr><th> 公債代號 </th> <th>清算銀行 </th> <th> 客戶帳號 </th> " +
        "<th> 公債面額 </th> <th> 公債年期 </th> <th> 公債發行日 </th> <th> 公債到期日 </th> <th> 票面利率(%) </th>" +
        "<!--th> 現在日期 </th--> <th> 下次付息日 </th> <th> 應付利息/本息 </th> <!--th> 已收利息 </th --> <!-- th> 到期還本付息 </th> <th> 計息至選定日 </th> <th> 選定日 </th--> </tr></thead><tbody>";

    var seclist_len = TransactionMatcher.getSecuritiesListLength();

    var htmlstr_hidden = "";
    var cnt_secid=0;
    var cnt_bank=0;
    var cnt_cust=0;

    console.log("seclist_len"+seclist_len);

    for(var i=0; i<seclist_len; i++) {

        var sec_id = web3.toAscii(TransactionMatcher.getSecuritiesList(i));
        sec_id = sec_id.replace(/\0[\s\S]*$/g,'');

        if(_pick_sec.length != 0) {
            if (sec_id != _pick_sec) {
                continue;
            }
        }

        var fields_1 = TransactionMatcher.getSecuritiesStatus(sec_id);

        //var sec_price = fields_1[1];

        var fields_2 = TransactionMatcher.getSecuritiesInfo(sec_id);

        var fields_2_n = new Number(fields_2[0]);
        var fields_2_m = fields_2_n/10000;
        var sec_int_rate_display = fields_2_m.toFixed(4);
        var sec_int_rate = (fields_2_n/1000000).toFixed(5);

        //alert(sec_int_rate)

        var sec_start_tm = tsConverter(fields_2[1]);

        var sec_end_tm = tsConverter(fields_2[2]);

        var sec_period = parseInt(fields_2[3]);

        var d1=new Date(sec_start_tm);
        //var y1=parseInt(d1.getFullYear());
        var d0=new Date(sec_end_tm);
        var d2=new Date(_pick_date);

        var is_repay = false;

        if(d2 >= d0) {
            is_repay = true; /* 還本付息 */
        }else if( (d0-d2) <= 86400000 ) {
            is_repay = true;
        }

        var d3=(d2-d1)/86400000;

        var _p_period = d3/365; /* 每期應付利息 */

        //console.log("date" + d3 + " "+d1+" "+d2)


        //var paydatescnt = SecuritiesInterest.getPayDatesListLength(sec_id);
        var next_pay_date;

        //console.log("paydatescnt"+paydatescnt);
        //for (var x=0; x< paydatescnt; x++) {
        var x=0;
        var _pick_ts = toTimestamp(d2);

        cnt_bank = 0;

        var shouldPay = false;
        var isPayDate = false;

        for(var x=0; x<sec_period; x++) {

            next_pay_date = SecuritiesInterest.getPayDatesList(sec_id, x);

            console.log("next_pay_date " + next_pay_date + " pick_ts" + _pick_ts);

            var a1 = parseInt(_pick_ts);
            var a2 = parseInt(next_pay_date);
            if(a1 < a2) {
                if ((a2 - a1) > 31622400) {
                    console.log("err" + (a2-a1));
                }else {
                    if( (a2 - a1) <= 86400 ) {
                        shouldPay = true;    // 隔天為計息日
                    }
                    console.log("right" + (a2-a1) + " " + shouldPay + " " + is_repay);
                    break;
                }
            }else if( (a1 >= a2) && (a1-a2<=86400)) {
                shouldPay = true;    // 當天為計息日
                isPayDate = true;
                console.log("right" + (a1-a2) + " " + shouldPay + " " + is_repay);
                break;
            }
        }

        //var a5 = new Date(next_pay_date * 1000);
        //var y5 = parseInt(a5.getFullYear());

        //var paid_period = y5-y1-1;

        var sec_period = fields_2[3];

        var banklist_len = TransactionMatcher.getBankListLength(sec_id);

        var cnt = 0;

        for (var j=0; j< banklist_len; j++) {

            var bank_id = web3.toAscii(TransactionMatcher.getSecuritiesOwnedByBank(sec_id, j));
            bank_id=bank_id.replace(/\0[\s\S]*$/g,'');


            if(_pick_bank.length == 5) {
                if (bank_id!= _pick_bank) {
                    continue;
                }
            }

            /*
            var bankContractAddress = eval('contractAbi.'+bank_id+'ContractAddress')
            var bankContract = BankContract.at(bankContractAddress);
            */

                // console.log("bank"+bank_id);

            var custlist_len = TransactionMatcher.getBankCustomerListLength(bank_id);

            cnt_cust = 0;

            for (var k=0; k< custlist_len; k++) {

                var cust_id = web3.toAscii(TransactionMatcher.getBankCustomerList(bank_id, k));
                cust_id = cust_id.replace(/\0[\s\S]*$/g,'');

                var cust_amount = TransactionMatcher.getCustomerSecuritiesAmount(sec_id, bank_id, cust_id);

                var interest = 0;
                //var field1s = bankContract.getCustomerSecuritiesInterest(sec_id, cust_id);
                //var paid_interest = field1s[0];

                //var repay = 0;
                //var duepay = 0;

                if(shouldPay) {
                    if(is_repay) {
                        interest =  Math.round((1 + sec_period * sec_int_rate) * cust_amount);
                    }else {
                        interest = Math.round(_period * cust_amount * sec_int_rate);
                    }
                    //duepay = Math.round(_p_period * cust_amount * sec_int_rate);
                }

                htmlstr += "<tr><td>" +sec_id + "</td>";
                htmlstr += "<td>" + bank_id + "</td>";
                htmlstr += "<td>" + cust_id + "</td><td align='right'>" + addComma(cust_amount) +"</td><td>" + sec_period +"</td>";
                htmlstr += "<td>" + sec_start_tm + "</td><td>" + sec_end_tm + "</td><td>" + sec_int_rate_display + "</td>";
                // htmlstr += "<td align='right'>" + addComma(interest) + "</td><td align='right'>"+ tsConverter(next_pay_date+" ") +
                // "</td><td align='right'>"+ addComma(repay) +"</td><!--td  align='right'>" + addComma(duepay) + "</td><td>" + _pick_date + "</td--></tr>";

                htmlstr += "<!--td>" + _pick_date + "</td--><td>" + tsConverter(next_pay_date+" ") +
                    "</td><td align='right'>" + addComma(interest) + "</td></tr>";
                    //"<td align='right'>" + addComma(paid_interest) + "</td></tr>";

                htmlstr_hidden += '<div id="exe_s' + cnt_secid + '_b' + cnt_bank + '_c' + cnt_cust +'" hidden data-value="' + cust_id + '$' + interest + '"></div>';

                // console.log(htmlstr);
                interest_array[cnt] = [sec_id,bank_id, cust_amount, interest];
                cnt++;
                cnt_cust++;

            }

            htmlstr_hidden += '<div id="cnt_s'+ cnt_secid +'_bank'+ cnt_bank + '_cust" hidden data-value="' + cnt_cust + '"></div>';

            var bank_amount = TransactionMatcher.getBankSecuritiesAmount(sec_id, bank_id);

            var bank_interest = 0;

            //var field2s = bankContract.getCustomerSecuritiesInterest(sec_id, bank_id+'-000-00000');
            //var bank_paid_interest = field2s[0];


            if(shouldPay) {
                if(is_repay) {
                    bank_interest =  Math.round((1 + sec_period * sec_int_rate) * bank_amount);;
                }else {
                    bank_interest =  Math.round(_period * bank_amount * sec_int_rate);
                }
            }

            htmlstr += '<tr style="color:red"><td>' +sec_id + "</td>";
            htmlstr += "<td>" + bank_id + "</td>";
            htmlstr += "<td>" + '**TOTAL**' + "</td><td align=\'right\'>" + addComma(bank_amount) +"</td><td>" + sec_period +"</td>";
            htmlstr += "<td>" + sec_start_tm + "</td><td>" + sec_end_tm + "</td><td>" + sec_int_rate_display + "</td>";
            // htmlstr += "<td align='right'>" + addComma(bank_interest) + "</td><td align='right'>"+ tsConverter(next_pay_date+" ")
            // + "</td><td align='right'>"+ addComma(bank_repay) +"</td><!--td  align='right'>" + addComma(bank_duepay) + "</td><td>" + _pick_date + "</td--></tr>";

            htmlstr += "<!--td>" + _pick_date + "</td--><td>" + tsConverter(next_pay_date+" ") +
                "</td><td align='right'>" + addComma(bank_interest) + "</td></tr>";
                // "<td align='right'>" + addComma(bank_paid_interest) + "</td></tr>";

            htmlstr_hidden += '<div id="exe_s' + cnt_secid + '_b' + cnt_bank + '" hidden data-value="' +  sec_id + '$' + bank_id + '$' + bank_interest + '$' + next_pay_date + '"></div>';

            //console.log(htmlstr);

            cnt_bank++;

        }
        //alert(JSON.stringify(interest_array));
        htmlstr_hidden += '<div id="cnt_s' + cnt_secid + '_bank" hidden data-value="' + cnt_bank + '"></div>';
        htmlstr_hidden += '<div id="s' + cnt_secid + '_payflag" hidden data-value="' + isPayDate + '"></div>';

        cnt_secid++;

    }

    htmlstr_hidden += '<div id="cnt_sec" hidden data-value="' + cnt_secid + '"></div>';
    htmlstr+=htmlstr_hidden;

    console.log(htmlstr);

    response.end(htmlstr);

});


router.get( '/payInterest/:sec_id/:bank_id/:cust_id/:interest/:next_pay_date', function(request, response) {

    //http://127.0.0.1:3000/payInterest/' + _sec_id + '/' + _bank_id + '/' + _interest + '/' + _next_pay_date

    var _sec_id = request.params.sec_id;
    var _bank_id = request.params.bank_id;
    var _cust_id = request.params.cust_id;
    var _interest = request.params.interest;
    var _next_pay_date = request.params.next_pay_date;

    console.log("payInterest/"+ _sec_id + '/' + _bank_id + '/' + _cust_id + '/' +  _interest + '/' + _next_pay_date);


    var txHashB = SecuritiesInterest.setShouldPayInterest(_sec_id, _next_pay_date ,false, {
            from: CB_admin,
            gas: 6000000,
            privateFor: [
                //eval('key_' + _bank_id),
            ]
        }, function (err, txhash) {
            if (!err) {
                var theEvent2 = SecuritiesInterest.EventSetShouldPayInterest({
                    from: CB_admin,
                });
                theEvent2.watch(function (err, event) {
                    //var ret0 = web3.toAscii(event.args._sec_id);
                    if (!err) {
                        theEvent2.stopWatching();
                        console.log("設定付息旗標完成");

                        var bankContractAddress = eval('contractAbi.'+_bank_id+'ContractAddress')
                        console.log(bankContractAddress);

                        var bankContract = BankContract.at(bankContractAddress);

                        //setCustomerSecuritiesInterest(bytes32 _bank_id, bytes32 _securities_id, bytes32 _customer_id, int _interest)
                        var txHashC = bankContract.setCustomerSecuritiesInterest(_sec_id, _cust_id, _interest,{
                                from: CB_admin,
                                gas: 6000000,
                                privateFor: [
                                    eval('key_' + _bank_id),
                                ]
                            }, function (err, txhash) {
                                if (!err) {
                                    var theEvent2 = bankContract.EventForSetCustomerSecuritiesInterest({
                                        from: CB_admin,
                                    });
                                    theEvent2.watch(function (err, event) {
                                        //var ret0 = web3.toAscii(event.args._sec_id);
                                        if (!err) {
                                            theEvent2.stopWatching();
                                            console.log("付息完成");
                                            response.end("SUCCESS");
                                        } else {
                                            console.log('付息失敗');
                                            response.end("ERROR");
                                        }
                                    });

                                } else {
                                    console.log('付息失敗');
                                    response.end("ERROR");
                                }

                            }
                        );

                        //response.end(ret0);
                    } else {
                        console.log('設定付息旗標失敗');
                        response.end("ERROR");
                    }
                });

            } else {
                console.log('設定付息旗標失敗');
                response.end("ERROR");
            }

        }
    );


});


router.get('/payStatus/:sec', function(request, response) {

    var _pick_sec = request.params.sec;

    if(_pick_sec=="NA") _pick_sec = "";

    console.log("payStatus/"+_pick_sec);

    var htmlstr = "<table class=\"table\"><thead><th> 公債代號 </th> <th> 付息日 </th> <th> 付息狀態 </th> </thread>";

    var datelist_len = SecuritiesInterest.getPayDatesListLength(_pick_sec);

    console.log("datelist_len"+datelist_len);

    for(var i=0; i<datelist_len; i++) {

        var date_id = SecuritiesInterest.getPayDatesList(_pick_sec, i);
        date_id = date_id+"";

        console.warn(date_id);

        var should_paid = SecuritiesInterest.shouldPayInterest(_pick_sec, date_id);

        var paid_html;

        if (!should_paid) {
            //paid_html = '<input type="checkbox" name="checked_' + i + '" value="checked_' + i + '" checked readonly>';
            paid_html = '<span class="m-badge m-badge--danger m-badge--wide m--font-boldest ">已付息</span>'
        } else {
            paid_html = '<span></span>';
        }


        var date_str = tsConverter(date_id);

        htmlstr += "<tr><td>" + _pick_sec + "</td>";
        htmlstr += "<td>" + date_str + "</td>";
        htmlstr += "<td>" + paid_html + "</td></tr>";
    }

    htmlstr += "</table>";

    console.log(htmlstr);

    response.end(htmlstr);

});


router.get( '/querySecurities/:securities_id', function (request, response) {

    var _securities_id = request.params.securities_id;

    var _field1 = TransactionMatcher.getSecuritiesStatus(_securities_id);

    var _total_amount = _field1[0];
    //var _unit_price = _field1[1]
    var _available  = _field1[1];

    var _field2 = TransactionMatcher.getSecuritiesInfo(_securities_id);
    var _interest_rateX10K = _field2[0]/10000;
    // alert(_field2[0]);
    var _start_tm = tsConverter(_field2[1]);
    var _end_tm = tsConverter(_field2[2]);
    var _period = _field2[3];

    //var result = _securities_id +" "+_amount+" "+_unit_price+" "+_available+" "+_interest_rateX100+" "+_start_tm+" "+_end_tm+" "+_period+ "\n";

    //alert(result)

    var tree_child_str = " [";

    var _bank_len = TransactionMatcher.getBankListLength(_securities_id);

    //alert(_bank_len);

    var total_amount = 0;
    var total_position = 0;

    for(var i=0; i< _bank_len; i++) {
        var _bank = web3.toAscii(TransactionMatcher.getSecuritiesOwnedByBank(_securities_id, i));
        var _bank_str = _bank.replace(/\0[\s\S]*$/g,'');
        tree_child_str += "{\"text\":\"" + _bank_str + "\"," +
            "\"icon\":\"fa fa-folder m--font-danger\"," +
            "\"children\":[";
        //var _amount = TransactionMatcher.getSecuritiesBalance(_securities_id, _bank);
        var _len = TransactionMatcher.getBankCustomerListLength(_bank)
        for(var j=0; j<_len; j++) {
            var _customer = web3.toAscii(TransactionMatcher.getBankCustomerList(_bank, j));
            var _customer_str = _customer.replace(/\0[\s\S]*$/g,'');
            var _customer_amount = TransactionMatcher.getCustomerSecuritiesAmount(_securities_id,_bank,_customer)
            var _position = TransactionMatcher.getCustomerSecuritiesPosition(_securities_id,_bank,_customer)

            total_amount += parseInt(_customer_amount);
            total_position += parseInt(_position);

            tree_child_str += "{\"text\":\"" + _customer_str + "(餘額"+ addComma(_customer_amount) + " , 可動支餘額" + addComma(_position) + ")\"" +
                ",\"icon\":\"fa fa-file m--font-info\"}";
            if(j!=_len-1) // not the last record
            {
                tree_child_str += ",";
            }
        }

        tree_child_str+= "]},";

    }

    tree_child_str += "{\"text\": \"票面利率 = " + _interest_rateX10K +
        "\%, 發行總額 = " + addComma(_total_amount) + ", 發行日 = " + _start_tm + " , 到期日 = " + _end_tm + "\"}]";

    console.log(total_amount+"*"+total_position+"@"+tree_child_str);

    response.end(total_amount+"*"+total_position+"@"+tree_child_str);

});


router.get( '/queryBankSecurities/:bank_id', function (request, response) {

    var _bank_id = request.params.bank_id;
    //var _cust_id = request.params.cust_id;

    var Bank = BankContract.at(eval('contractAbi.' + _bank_id + 'ContractAddress'));


    //var result = _securities_id +" "+_amount+" "+_unit_price+" "+_available+" "+_interest_rateX100+" "+_start_tm+" "+_end_tm+" "+_period+ "\n";

    //alert(result)

    var tree_child_str = " [";

    var _cust_len = TransactionMatcher.getBankCustomerListLength(_bank_id);
    var total_amount = 0;
    var total_position = 0;

    //alert(_bank_len);

    for(var i=0; i< _cust_len; i++) {

        var _cust = web3.toAscii(TransactionMatcher.getBankCustomerList(_bank_id, i));
        var _cust_str = _cust.replace(/\0[\s\S]*$/g,'');


        var _field1 = Bank.getCustomerInfo(_cust);

        var _cust_name = _field1[0];
        var _cust_type = _field1[1];


        tree_child_str += "{\"text\":\"" + _cust_str + " (" + _cust_name + " , " + _cust_type + ")\"," +
            "\"icon\":\"fa fa-folder m--font-danger\"," +
            "\"children\":[";
        //var _amount = TransactionMatcher.getSecuritiesBalance(_securities_id, _bank);
        var _len = TransactionMatcher.getCustomerSecuritiesListLength(_bank_id, _cust)
        for(var j=0; j<_len; j++) {
            var _sec = web3.toAscii(TransactionMatcher.getCustomerSecuritiesList(_bank_id, _cust, j));
            var _sec_str = _sec.replace(/\0[\s\S]*$/g,'');
            var _amount = TransactionMatcher.getCustomerSecuritiesAmount(_sec,_bank_id,_cust)
            var _position = TransactionMatcher.getCustomerSecuritiesPosition(_sec,_bank_id,_cust)

            total_amount+= parseInt(_amount);
            total_position+=parseInt(_position);

            tree_child_str += "{\"text\":\"" + _sec_str + "(餘額"+ addComma(_amount) + " , 可動支餘額" + addComma(_position) + ")\"" +
                ",\"icon\":\"fa fa-file m--font-info\"}";
            if(j!=_len-1) // not the last record
            {
                tree_child_str += ",";
            }
        }

        tree_child_str+= "]},";

    }

    tree_child_str += "{\"text\": \" " + "\"}]";

    console.log(total_amount+"*"+total_position+"@"+tree_child_str);

    response.end(total_amount+"*"+total_position+"@"+tree_child_str);

});


// 由DB讀取
router.get( '/checkTxnInfo/:qryJSON', function (request, response) {

    var query = request.params.qryJSON;

    console.log("/checkTxnInfo/"+ query);

    if(query == "NA") {
        dbConnection.collection("txns").find().toArray(function(err, result) {
            if (err) throw err;
            //console.log(JSON.stringify(result));
            response.end(JSON.stringify(result));
        });
    }else {
        var JSONquery = JSON.parse(query);
        dbConnection.collection("txns").find(JSONquery).toArray(function(err, result) {
            if (err) throw err;
            //console.log(JSON.stringify(result));
            response.end(JSON.stringify(result));
        });
    }
});

router.get( '/queryBlock/:txnseq/:txhash1/:blocknum1/:txhash2/:blocknum2/:txhash3/:blocknum3/:txhash4/:blocknum4/:txhash5/:blocknum5', function (request, response) {


    var _txnseq   = request.params.txnseq;
    var _txhash1 = request.params.txhash1;
    var _txhash2 = request.params.txhash2;
    var _txhash3 = request.params.txhash3;
    var _txhash4 = request.params.txhash4;
    var _txhash5 = request.params.txhash5;

    var _blocknum1 = request.params.blocknum1;
    var _blocknum2 = request.params.blocknum2;
    var _blocknum3 = request.params.blocknum3;
    var _blocknum4 = request.params.blocknum4;
    var _blocknum5 = request.params.blocknum5;

    console.log("/queryBlock/"+_txnseq + "/" + _txhash1+"/"+_blocknum1+"/"+_txhash2+"/"+_blocknum2+"/"+_txhash3+"/"+_blocknum3+"/"+_txhash4+"/"+_blocknum4+"/"+_txhash5+"/"+_blocknum5);


    var txnJson1;
    var txnJson2;
    var txnJson3;
    var txnJson4;
    var txnJson5;

    //var blockJson1;
    //var blockJson2;
    //var blockJson3;
    //var blockJson4;
    //var blockJson5;

    var htmlstr;
    var cnt = 0;

    htmlstr = '<div class="m-timeline-1 m-timeline-1--fixed"> <div class="m-timeline-1__items">' +
        '<div class="m-timeline-1__marker"></div>';


    if(_txhash1!="NA" && _blocknum1!="NA") {
        txnJson1 = web3.eth.getTransactionReceipt(_txhash1);
        //txnJson1 = web3.eth.getBlock(_blocknum1);
        delete txnJson1["logs"];
        delete txnJson1["logsBloom"];
        delete txnJson1["contractAddress"];
        //txnJson1["txnseq"] = _txnseq;

        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson1);
        //blockJson1 = web3.eth.getBlock(_blocknum1);
        if(cnt == 0) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left m-timeline-1__item--first">';
        }else if(cnt%2 == 1) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--right">';
        }else {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left">';
        }
        htmlstr += '<div class="m-timeline-1__item-circle"><div class="m--bg-danger"></div> </div> <div class="m-timeline-1__item-arrow"></div>' +
            '<span class="m-timeline-1__item-time m--font-brand">';
        htmlstr += 'Block '+ _blocknum1 + '</span><div class="m-timeline-1__item-content"> <div class="m-timeline-1__item-title">';
        //htmlstr += '序號 [' + addNewLine(_txhash1,20) + '] <br/>';
        htmlstr += '狀態 [ Pending ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        htmlstr += addNewLine(tmpstr,30) + '</div></div></div></div>';

        cnt++;
    }

    if(_txhash2!=="NA" && _blocknum2!="NA") {
        txnJson2 = web3.eth.getTransactionReceipt(_txhash2);
        //txnJson2 = web3.eth.getBlock(_blocknum2);
        delete txnJson2["logs"];
        delete txnJson2["logsBloom"];
        delete txnJson2["contractAddress"];
        //txnJson2["txnseq"] = _txnseq;
        var tmpstr =  ' "txnseq":"'+ _txnseq + '"' +JSON.stringify(txnJson2);
        //blockJson2 = web3.eth.getBlock(_blocknum2);
        if(cnt == 0) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left m-timeline-1__item--first">';
        }else if(cnt%2 == 1) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--right">';
        }else {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left">';
        }

        htmlstr +=
            '<div class="m-timeline-1__item-circle"><div class="m--bg-danger"></div> </div> <div class="m-timeline-1__item-arrow"></div>' +
            '<span class="m-timeline-1__item-time m--font-brand">';
        htmlstr += 'Block '+ _blocknum2 + '</span><div class="m-timeline-1__item-content"> <div class="m-timeline-1__item-title">';
        // += '序號 [' + addNewLine(_txhash2,20) + '] <br/>';

        if(cnt == 0) {
            htmlstr += '狀態 [ Pending ] <br/> [ Waiting4Payment ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        }else {
            htmlstr += '狀態 [ Waiting4Payment ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        }
        htmlstr += addNewLine(tmpstr,30) + '</div></div></div></div>';

        cnt++;
    }

    if(_txhash3!="NA" && _blocknum3!="NA") {
        txnJson3 = web3.eth.getTransactionReceipt(_txhash3);
        //txnJson3 = web3.eth.getBlock(_blocknum3);
        delete txnJson3["logs"];
        delete txnJson3["logsBloom"];
        delete txnJson3["contractAddress"];
        //txnJson3["txnseq"] = _txnseq;

        var tmpstr =  ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson3);
        //blockJson3 = web3.eth.getBlock(_blocknum3);
        if(cnt == 0) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left m-timeline-1__item--first">';
        }else if(cnt%2 == 1) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--right">';
        }else {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left">';
        }
        htmlstr +=
            '<div class="m-timeline-1__item-circle"><div class="m--bg-danger"></div> </div> <div class="m-timeline-1__item-arrow"></div>' +
            '<span class="m-timeline-1__item-time m--font-brand">';
        htmlstr += 'Block '+ _blocknum3 + '</span><div class="m-timeline-1__item-content"> <div class="m-timeline-1__item-title">';
        //htmlstr += '序號 [' + addNewLine(_txhash3,20)+ '] <br/>';

        if(cnt == 0) {
            htmlstr += '狀態 [ Pending ] <br/> [ Finished ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        } else {
            htmlstr += '狀態 [ Finished ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        }
        htmlstr += addNewLine(tmpstr,30) + '</div></div></div></div>';

        cnt++;
    }

    if(_txhash4!="NA" && _blocknum4!="NA") {
        txnJson4 = web3.eth.getTransactionReceipt(_txhash4);
        //txnJson4 = web3.eth.getBlock(_blocknum4);
        delete txnJson4["logs"];
        delete txnJson4["logsBloom"];
        delete txnJson4["contractAddress"];
        //txnJson4["txnseq"] = _txnseq;

        var tmpstr =  ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson4);
        //blockJson4 = web3.eth.getBlock(_blocknum4);
        if(cnt == 0) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left m-timeline-1__item--first">';
        }else if(cnt%2 == 1) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--right">';
        }else {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left">';
        }

        htmlstr +=
            '<div class="m-timeline-1__item-circle"><div class="m--bg-danger"></div> </div> <div class="m-timeline-1__item-arrow"></div>' +
            '<span class="m-timeline-1__item-time m--font-brand">';
        htmlstr += 'Block '+ _blocknum4 + '</span><div class="m-timeline-1__item-content"> <div class="m-timeline-1__item-title">';
        //htmlstr += '序號 [' + addNewLine(_txhash4,20) + '] <br/>';
        htmlstr += '狀態 [ Cancelled ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        htmlstr += addNewLine(tmpstr,30) + '</div></div></div></div>';

        cnt++;
    }

    /*
    if(_txhash5!="NA" && _blocknum5!="NA") {
        txnJson5 = web3.eth.getTransactionReceipt(_txhash5);
        //txnJson5 = web3.eth.getBlock(_blocknum5);
        delete txnJson5["logs"];
        delete txnJson5["logsBloom"];
        delete txnJson5["contractAddress"];
        // txnJson5["txnseq"] = _txnseq;
        var tmpstr =  ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson5);
        //blockJson5 = web3.eth.getBlock(_blocknum5);
        if(cnt == 0) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left m-timeline-1__item--first">';
        }else if(cnt%2 == 1) {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--right">';
        }else {
            htmlstr += '<div class="m-timeline-1__item m-timeline-1__item--left">';
        }

        htmlstr +=
            '<div class="m-timeline-1__item-circle"><div class="m--bg-danger"></div> </div> <div class="m-timeline-1__item-arrow"></div>' +
            '<span class="m-timeline-1__item-time m--font-brand">';
        htmlstr += 'Block '+ _blocknum5 + '</span><div class="m-timeline-1__item-content"> <div class="m-timeline-1__item-title">';
        //htmlstr += '序號 [' + addNewLine(_txhash5,20) + '] <br/>';
        htmlstr += '狀態 [ PaymentError ]</div><div class="m-timeline-1__item-body"><div class="m-timeline-1__item-body m--margin-top-15">';
        htmlstr += addNewLine(tmpstr,30) + '</div></div></div></div>';

        cnt++;
    }
    */

    htmlstr += '</div>';

    console.log(htmlstr);

    response.end(htmlstr);


});

// 直接由區塊鏈讀取
/*
router.get( '/checkTxnInfo/:str_time/:end_time', function (request, response) {

    var _str_time = request.params.str_time;
    var _end_time = request.params.end_time;

    var qrytable_data_array = [];  // initialize array

    var _txncnt = TransactionMatcher.getTransactionListLength();


    console.log("/checkTxnInfo/"+_str_time+"/"+_end_time);


    for(var i=0; i< _txncnt; i++) {

        var txnseq = web3.toAscii(TransactionMatcher.getTransactionList(i));

        var fields = TransactionMatcher.getTransactionInfo(txnseq);

        //function Transaction ( txnseq, from_bank, from_customer, to_bank, to_customer, amount, securities_id, payment, timestamp,
        //                       txnstate

        var from_bank = web3.toAscii(fields[0])
        var from_customer = web3.toAscii(fields[1])
        var to_bank = web3.toAscii(fields[2])
        var to_customer = web3.toAscii(fields[3])
        var securities_amount = fields[4]
        var securities_id = web3.toAscii(fields[5])
        var payment = fields[6]
        var timestamp = fields[7]
        //var rev_txnSerNo = fields[8]

        //console.log(timestamp);

        if( _str_time != "NA" && _end_time != "NA") {
            if(timestamp < _str_time || timestamp > _end_time) {
                continue;
            }
        }

        var field_r = TransactionMatcher.getTransactionReverseTxnSeq(txnseq);
        var rev_txnSerNo = web3.toAscii(field_r);

        //console.log(rev_txnSerNo);

        if (rev_txnSerNo.length < 5 || rev_txnSerNo.substr(0, 4) != "Bank") {
            rev_txnSerNo = "NA";
        }

        //var d = new Date();
        //var s_time = new Date(timestamp * 1000 + d.getTimezoneOffset() * 60000)

        var fields_2 = TransactionMatcher.getTransactionState(txnseq);
        var state;
        var err_code;

        if (fields_2[0] == "0") {
            state = "Pending";
        } else if (fields_2[0] == "1") {
            state = "Matched";
        } else if (fields_2[0] == "2") {
            state = "Finished";
        } else if (fields_2[0] == "3") {
            state = "Cancelled";
        } else if (fields_2[0] == "4") {
            state = "PaymentError";
        } else if (fields_2[0] == "5") {
            state = "Waiting4Payment";
        }

        if (fields_2[1] == "0") {
            err_code = "";
        } else if (fields_2[1] == "1") {
            err_code = "";
        } else if (fields_2[1] == "2") {
            err_code = "自行賣方券數不足";
        } else if (fields_2[1] == "3") {
            err_code = "跨行賣方券數不足";
        } else if (fields_2[1] == "4") {
            err_code = "";
        } else if (fields_2[1] == "5") {
            err_code = "交易被取消";
        } else {
            err_code = "同資錯誤" + fields_2[1];
        }

        if(rev_txnSerNo == "NA") {
            rev_txnSerNo = "";
        }

        qrytable_data_array[qrytable_data_array.length] = new Transaction(txnseq, from_bank, from_customer, to_bank, to_customer, securities_amount
            , securities_id , payment , soliditytsConverter(timestamp+" "), state, rev_txnSerNo, err_code);

    }

    //console.log(JSON.stringify(qrytable_data_array));
    response.end(JSON.stringify(qrytable_data_array));

});
*/

/*
router.get( '/checkAccBal/:acc', function (request, response) {

    var acc = request.params.acc;

    //console.log("/checkAccBal/",acc);

    redis_client.get(acc, function (err, data) {
        if(!err) {
            //console.log("checkAccBal ",data);
            response.end(data);
        }else {
            console.log("checkAccBal err");
            response.end("Error");
        }
    });
});
*/

function Transaction ( txnseq, from_bank, from_customer, to_bank, to_customer, amount, securities_id, payment, timestamp, txnstate, _rev_txnseq, causer, tx_hash, block_num) {

    this.filler = "";
    this.txnseq = txnseq;
    this.from_bank = from_bank;
    this.from_customer = from_customer;
    this.to_bank = to_bank;
    this.to_customer = to_customer;
    this.amount = amount;
    this.securities_id = securities_id;
    this.payment = payment;
    this.timestamp = timestamp;
    this.txnstate = txnstate;
    this.rev_txnseq = _rev_txnseq;
    this.causer = causer
    if(txnseq.substr(5,1) == 'S') {
        if(from_bank == to_bank) {
            this.txntype = "自行轉出";
        }else {
            this.txntype = "跨行轉出";
        }
    }else if(txnseq.substr(5,1) == 'B') {
        if(from_bank == to_bank) {
            this.txntype = "自行轉入";
        }else {
            this.txntype = "跨行轉入";
        }
    }

    this.txhash1;
    this.txhash2;
    this.txhash3;
    this.txhash4;
    this.txhash5;
    this.blocknum1;
    this.blocknum2;
    this.blocknum3;
    this.blocknum4;
    this.blocknum5;

    if(txnstate == "Pending") {
        this.txhash1 = tx_hash;
        this.blocknum1 = block_num;
    }else if(txnstate == "Waiting4Payment") {
        this.txhash2 = tx_hash;
        this.blocknum2 = block_num;
    }else if(txnstate == "Finished") {
        this.txhash3 = tx_hash;
        this.blocknum3 = block_num;
    }else if(txnstate == "Cancelled") {
        this.txhash4 = tx_hash;
        this.blocknum4 = block_num;
    } /*
    else if(txnstate == "PaymentError") {
        this.txhash5 = tx_hash;
        this.blocknum5 = block_num;
    }
    */

}

function FailedTransactionPair ( _txnseq1, _txnseq2, _from_bank, _to_bank, _payment) {

    this.txnseq1 = _txnseq1;
    this.txnseq2 = _txnseq2;
    this.from_bank = _from_bank;
    this.to_bank = _to_bank;
    this.payment = _payment;
}

function insertFailedTransactionPair( _txnseq1, _txnseq2, _from_bank, _to_bank, _payment) {

    _txnseq1.replace(/\0[\s\S]*$/g,'');
    _txnseq2.replace(/\0[\s\S]*$/g,'');

    var txn = new FailedTransactionPair ( _txnseq1, _txnseq2 , _from_bank, _to_bank, _payment);

    dbConnection.collection("failtxns").insertOne(txn, function (err, res) {
        if (err) {
            console.log("MongoDB Operation ERROR!!!")
            return;
        }
        console.log("1 failtxns document inserted");
    });

    /*
    dbConnection.collection("failtxns").find({"txnseq": _txnseq}).toArray(function(err, result) {
        if (err) throw err;
        //console.log(JSON.stringify(result));
        if(result.length == 0) {
            dbConnection.collection("failtxns").insertOne(txn, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 failtxns document inserted");
            });

        } else {
            var myquery = { txnseq: _txnseq };
            var newvalues;

            newvalues = { $set: { is_failed: _is_failed } };

            console.log(myquery);
            console.log(newvalues);

            dbConnection.collection("failtxns").updateOne(myquery, newvalues, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 failtxns document updated");
            });
        }
    });
    */

}

function deleteFailedTransactionPair(_txnseq1) {

    dbConnection.collection("failtxns").deleteOne( { "$or" : [{"txnseq1": _txnseq1}, {"txnseq2": _txnseq1}] } , function (err, res) {
        if (err) {
            console.log("MongoDB Operation ERROR!!!")
            return;
        }else {
            console.log("1 failtxns document deleted");
        }
    });
}


function BankBalance(_bank, _balance) {

    this.bank = _bank;
    this.balance = _balance;
}

/*
function queryBankBalance(_bank) {

    var result = dbConnection.collection("bankbalance").find({"bank": _bank}).toArray();
    return result["balance"];

}
*/

function initCache() {

    dbConnection.collection("bankbalance").find({"bank": "Bank2"}).toArray(function(err, result) {

        if (err) return;

        //console.log("result "+result);
        var _balance = result[0]["balance"] + "";

        Bank2_Balance = _balance;

        console.log("Bank2 "+ " " + _balance);

    });

    dbConnection.collection("bankbalance").find({"bank": "Bank4"}).toArray(function(err, result) {

        if (err) return;

        //console.log("result "+result);
        var _balance = result[0]["balance"] + "";

        Bank4_Balance = _balance;

        console.log("Bank4 "+ " " + _balance);

    });

    dbConnection.collection("bankbalance").find({"bank": "Bank5"}).toArray(function(err, result) {

        if (err) return;

        //console.log("result "+result);
        var _balance = result[0]["balance"] + "";

        Bank5_Balance = _balance;

        console.log("Bank5 "+ " " + _balance);

    });
}


function insertUpdateBankBalance(_bank, _balance, _emitEvent) {

    _bank = _bank.substr(0,5)

    var txn = new BankBalance(_bank, _balance);
    //var _payment = parseInt(_balance);

    //eval(_bank+"_Balance=parseInt("+ _bank +"_Balance) + parseInt(_balance)");

    var new_balance = 0;

    if(_bank=="Bank2") {
        Bank2_Balance = parseInt(Bank2_Balance) + parseInt(_balance);
        new_balance = Bank2_Balance;
    }else if(_bank == "Bank4") {
        Bank4_Balance = parseInt(Bank4_Balance) + parseInt(_balance);
        new_balance = Bank4_Balance;
    }else if(_bank == "Bank5") {
        Bank5_Balance = parseInt(Bank5_Balance) + parseInt(_balance);
        new_balance = Bank5_Balance;
    }

    console.log(Bank2_Balance + " " + Bank4_Balance + " " + Bank5_Balance +" ");

    dbConnection.collection("bankbalance").find({"bank": _bank}).toArray(function(err, result) {
        if (err) throw err;
        //console.log(JSON.stringify(result));
        if(result.length == 0) {
            dbConnection.collection("bankbalance").insertOne(txn, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 bankbalance document inserted");
                //settleFailedTransaction(_bank);
            });

        } else {
            var myquery = { "bank": _bank };

            //var array = JSON.parse(result);

            //console.log(result);
            //console.log(result[0]["balance"]);

            /* 避免dirty read, 以Cache資料寫入
            var old_balance = parseInt(result[0]["balance"]);
            if(isNaN(old_balance)) {
                old_balance = 0;
            }
            var new_balance = old_balance + parseInt(_balance);
            console.log("old_balance" + old_balance);
            console.log("new_balance" + new_balance);
            */

            //var newvalues;

            var newvalues = { $set: { "balance" : new_balance } };

            console.log(myquery);
            console.log(newvalues);

            dbConnection.collection("bankbalance").updateOne(myquery, newvalues, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 bankbalance document updated");
                //settleFailedTransaction(_bank);

                if(_emitEvent == true) {
                    emitter.emit('depositCBEvent', _bank);
                }

            });
        }
    });

}

function soliditytsConverter(ts){

    if (ts == 0) return "";
    var t = ts.substr(0,10);
    var a = new Date(t * 1000);
    var year = a.getFullYear();
    var month = a.getMonth()+1;
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    return year + '/' + month + '/' + date + '  ' + hour + ':' + min + ':' +sec;
}

function tsConverter(ts){

    if (ts == 0) return "";

    var a = new Date(ts * 1000);
    var year = a.getFullYear();
    var month = a.getMonth()+1;
    var date = a.getDate();
    /*
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    */
    return  (year + '-'  + month  +  '-' + date)
}


function addComma(number) {

    var num = number.toString();
    var pattern = /(-?\d+)(\d{3})/;

    while(pattern.test(num))
    {
        num = num.replace(pattern, "$1,$2");

    }
    return num;
}


function insertUpdateTxn( txnseq , status, ret_code, ret_reason, txn_hash, block_number) {

    var s0 = txnseq;
    var retA = ret_code;
    var retB = ret_reason;

    var fields = TransactionMatcher.getTransactionInfo(s0);

    var field_r = TransactionMatcher.getTransactionReverseTxnSeq(s0);
    var ret9 = web3.toAscii(field_r);

    if (ret9.length < 5 || ret9.substr(0, 4) != "Bank") {
        ret9 = "";
    }

    //function Transaction ( txnseq, from_bank, from_customer, to_bank, to_customer, amount, securities_id, payment, timestamp,
    //                       txnstate

    var ret1 = web3.toAscii(fields[0])
    var ret2 = web3.toAscii(fields[1])
    var ret3 = web3.toAscii(fields[2])
    var ret4 = web3.toAscii(fields[3])
    var ret5 = fields[4]
    var ret6 = web3.toAscii(fields[5])
    var ret7 = fields[6]
    var ret8 = fields[7]
    //var rev_txnSerNo = fields[8]
    var s1 = ret1.replace(/\0[\s\S]*$/g,'');
    var s2 = ret2.replace(/\0[\s\S]*$/g,'');
    var s3 = ret3.replace(/\0[\s\S]*$/g,'');
    var s4 = ret4.replace(/\0[\s\S]*$/g,'');
    var s5 = ret5.toNumber();
    var s6 = ret6.replace(/\0[\s\S]*$/g,'');
    var s7 = ret7.toNumber();
    var s8 = ret8.toNumber();
    var s9 = ret9.replace(/\0[\s\S]*$/g,'');
    var err_code;

    if (retA == "0") {
        err_code = "";
    } else if (retA == "1") {
        err_code = "";
    } else if (retA == "2") {
        err_code = "買賣方帳號相同";
    } else if (retA == "3") {
        err_code = "賣方券數不足";
    } else if (retA == "4") {
        err_code = "";
    } else if (retA == "5" || retA == "6" || retA == "7") {
        // err_code = "交易被取消";
    } else if (retA == "99" || retA == "100" || retA == "500" || retA == "200") {
        err_code = retB;
    }

    if(retB == "E1" || retB == "E2" || retB == "E3" || retB == "E4" || retB == "E5" || retB == "E6" || retB == "E7") {
        err_code = retB;
        s9 = "";
    }else if(retB == "SOM") {
        err_code = "同資款項不足";
    }


    var txn = new Transaction ( s0, s1, s2, s3, s4, s5, s6, s7, s8, status, s9, err_code, txn_hash, block_number);

    //response.end("SENDTXN_CANCELLED");


    dbConnection.collection("txns").find({"txnseq": s0}).toArray(function(err, result) {
        if (err) throw err;
        //console.log(JSON.stringify(result));
        if(result.length == 0) {
            dbConnection.collection("txns").insertOne(txn, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 document inserted");
            });

        } else {
            var myquery = { txnseq: s0 };
            var newvalues;

            if(status == "Pending") {
                console.log(status+" "+txn_hash + " " + block_number);
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash1 : txn_hash, blocknum1 : block_number  } };
            }else if(status == "Waiting4Payment") {
                console.log(status+" "+txn_hash + " " + block_number);
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash2 : txn_hash, blocknum2 : block_number  } };
            }else if(status == "Finished") {
                console.log(status+" "+txn_hash + " " + block_number);
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash3 : txn_hash, blocknum3 : block_number  } };
            }else if(status == "Cancelled") {
                console.log(status+" "+txn_hash + " " + block_number);
                if(retA!="5" && retA!="6") {
                    newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash4 : txn_hash, blocknum4 : block_number  } };
                } else {
                    // end-of-day cancel 不改 causer
                    if(retB == "SOM") {
                        newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash4 : txn_hash, blocknum4 : block_number  } };
                    }else {
                        newvalues = { $set: { txnstate: status, rev_txnseq : s9, txhash4 : txn_hash, blocknum4 : block_number  } };
                    }
                }

            } /*
            else if(status == "PaymentError") {
                console.log(status+" "+txn_hash + " " + block_number);
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash5 : txn_hash, blocknum5 : block_number  } };
            }
            */

            console.log(myquery);
            console.log(newvalues);

            dbConnection.collection("txns").updateOne(myquery, newvalues, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 document updated");
            });
        }
    });

}

function addNewLine(data, line_len) {


    var new_data;

    for(var i=0,j=0;i<data.length;i++,j++) {


        if(data.charAt(i) == ',' || data.charAt(i) == '{' || data.charAt(i) == '}') {
            new_data += '<br/>'
            j=0;
            continue;
        }

        new_data += data.charAt(i);

        if(j%line_len == 0) {
            new_data += '<br/>'
        }

    }

    var ret_data = new_data.replace("undefined", " ");

    return(ret_data);

}

function toTimestamp(strDate){
    var datum = Date.parse(strDate);
    return datum/1000;
}
