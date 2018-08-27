var Http = require( 'http' ),
    Router = require( 'router' ),
    server,
    router;
router = new Router();

var BodyParser = require('body-parser');
var Promise = require('promise');
var crypto = require('crypto');
var cors = require('cors');
var contractAbi = require('./ContractABI');

var events = require('events');

var esc_red_str = "\\033[0;31m " + Math.round(new Date().getTime()/1000);;
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

});

var CC_TIMEOUT = 600;


var Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:22000'));
var eth = web3.eth;

var web3_v2 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
var eth_v2 = web3_v2.eth;

var TransactionMatcherContract = web3.eth.contract(contractAbi.TransactionMatcherAbi);
var TransactionMatcher = TransactionMatcherContract.at(contractAbi.TransactionMatcherAddress);

var PaymentMatcherContract = web3_v2.eth.contract(contractAbi.PaymentMatcherAbi);
var PaymentMatcher = PaymentMatcherContract.at(contractAbi.PaymentMatcherAddress);

var CB_admin = '0xed9d02e382b34818e88b88a309c7fe71e65f419d';

var key_Bank1 = "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo="
var key_Bank2 = "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc="
var key_Bank3 = "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg="
var key_Bank4 = "oNspPPgszVUFw0qmGFfWwh1uxVUXgvBxleXORHj07g8="
var key_Bank5 = "R56gy4dn24YOjwyesTczYa8m5xhP6hF2uTMCju/1xkY="
var key_Bank6 = "UfNSeSGySeKg11DVNEnqrUtxYRVor4+CvluI8tVv62Y="
var key_Bank7 = "ROAZBWtSacxXQrOe3FGAqJDyJjFePR5ce4TSIzmJ0Bc="

var timeoutChecker=setInterval(chkTimeoutAndCancelPayment,10000);

if(web3.isConnected() && web3_v2.isConnected()) {

    console.log('connected to quorum enode [node2:22000], starting event listening ...');

    var event1 = PaymentMatcher.EventForPaymentFinished({some: "_paymentSerNo1"},{fromBlock:eth_v2.blockNumber, toBlock: 'latest' });
    event1.watch(function(error, event){
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._paymentSerNo1);
            var ret1 = web3.toAscii(event.args._paymentSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            console.log(esc_red_str+"交易序號："+ret0+" EventForPaymentFinished"+esc_red_end);
            console.log(esc_red_str+"交易序號："+ret1+" EventForPaymentFinished"+esc_red_end);

            var from_bank;
            var to_bank;

            if(ret0.substr(5,1) == "S") {
                from_bank = ret0.substr(0,5);
                to_bank = ret1.substr(0,5);
            }else if(ret1.substr(5,1) == "S") {
                to_bank = ret0.substr(0,5);
                from_bank = ret1.substr(0,5);
            }

            //insertUpdateTxn(s0, "Waiting4Payment", "0" , "", txhash, blocknum);
            //insertUpdateTxn(s1, "Waiting4Payment", "0" , "", txhash, blocknum);

            console.log("from_bank =" + from_bank);
            console.log("to_bank =" + to_bank);

            var fields = TransactionMatcher.getTransactionInfo(ret0);
            var payment  = parseInt(fields[6]);

            console.log("payment " + payment);

            var fields_2 = TransactionMatcher.getTransactionState(ret0);
            if(fields_2[0] == "3" || fields_2[0] == "2") {
                console.log("交易已完成或被取消");
                return;
            }


            /*
            if( fields_2[0] == "0") {
                state="Pending";
            }else if(fields_2[0] == "1") {
                state="Matched";
            }else if(fields_2[0] == "2") {
                state="Finished";
            }else if(fields_2[0] == "3") {
                state="Cancelled";
            }else if(fields_2[0] == "4") {
                state="PaymentError";
            }else if(fields_2[0] == "5") {
                state="Waiting4Payment";
            }
            */


            //var isPaymentShortage = false;

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

                        deletePaymentPair(ret0);

                        console.log("正常執行")
                        console.log(txhash);
                    } else {
                        console.log(err);
                    }

                    //response.end(txnseq);
                }
            );

        }
    });

    //event EventForPaymentConfirmed(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, address msg_sender, bytes32 _paymentHash, bytes32 _secret);

    var event2 = PaymentMatcher.EventForPaymentConfirmed({some: "_paymentSerNo1"},{fromBlock:eth_v2.blockNumber, toBlock: 'latest' });
    event2.watch(function(error, event){
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));

            var ret0 = web3_v2.toAscii(event.args._paymentSerNo1);
            var ret1 = web3_v2.toAscii(event.args._paymentSerNo2);
            // compare msg.sender
            // var ret2 = web3_v2.toAscii(event.args.msg_sender);
            var ret3 = web3_v2.toAscii(event.args._paymentHash);
            var ret4 = web3_v2.toAscii(event.args._secret);

            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');
            var s3 = ret3.replace(/\0[\s\S]*$/g,'');
            var s4 = ret4.replace(/\0[\s\S]*$/g,'');

            console.log(esc_red_str+"交易序號："+ret0+" EventForPaymentConfirmed"+esc_red_end);
            console.log(esc_red_str+"交易序號："+ret1+" EventForPaymentConfirmed"+esc_red_end);

            var from_bank;
            var to_bank;

            if(ret0.substr(5,1) == "S") {
                from_bank = ret0.substr(0,5);
                to_bank = ret1.substr(0,5);
            }else if(ret1.substr(5,1) == "S") {
                to_bank = ret0.substr(0,5);
                from_bank = ret1.substr(0,5);
            }

            // 檢查 iff y=H(x)

            var payment_md5 = crypto.createHash('md5');
            var payment_md5_hash = payment_md5.update(s4).digest('hex');

            console.log("payment_hash="+payment_md5_hash+" secret="+s4);

            if(payment_md5_hash == s3) {
                console.log("驗證 y=H(x) 完成");
            }else {
                console.log("驗證 y=H(x) 失敗");
                return;
            }

            console.log("from_bank =" + from_bank);
            console.log("to_bank =" + to_bank);


            var fields_2 = TransactionMatcher.getTransactionState(s0);
            if(fields_2[0] == "3" || fields_2[0] == "2") {
                console.log("交易已完成或被取消");
                return;
            }

            var txHashA = PaymentMatcher.settleInterBankPayment(ret0, ret1, 0, true, {
                    from: eth_v2.accounts[0],
                    gas: 3000000,
                    /*
                        privateFor: [
                        //key_Bank1,
                            eval('key_' + from_bank),
                            eval('key_' + to_bank)
                        //key_Bank6
                        ]
                    */
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

        }
    });


    var event3 = PaymentMatcher.EventForPaymentPending({some: "_paymentSerNo"},{fromBlock:eth_v2.blockNumber, toBlock: 'latest' });
    event3.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));

            var ret0 = web3.toAscii(event.args._paymentSerNo);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');

            console.log(esc_red_str+"交易序號："+s0+" "+" EventForPaymentPending "+esc_red_end + " __paymentSerNo " + s0 );

        }
    });

    var event4 = PaymentMatcher.EventForPaymentCancelled({some: "_paymentSerNo"},{fromBlock:eth_v2.blockNumber, toBlock: 'latest' });
    event4.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));

            var ret0 = web3.toAscii(event.args._paymentSerNo);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');

            deletePaymentPair(s0);

            console.log(esc_red_str+"交易序號："+s0+" "+ " EventForPaymentCancelled ");

            var fields_2 = TransactionMatcher.getTransactionState(s0);
            if(fields_2[0] == "3" || fields_2[0] == "2") {
                console.log("交易已完成或被取消");
                return;
            }

            var _rc = 0;

            if(s0.charAt(5) == "S") {
                _rc = 5;
            }else {
                _rc = 6;
            }

            var fields = TransactionMatcher.getTransactionInfo(s0);
            var _from_bank = web3.toAscii(fields[0]);
            var _to_bank = web3.toAscii(fields[2]);

            _from_bank = _from_bank.substr(0,5);
            _to_bank = _to_bank.substr(0,5);

            if(_from_bank.length != 5 || _from_bank.substr(0,4) != "Bank" || _to_bank.length != 5 || _to_bank.substr(0,4) != "Bank")
            {

                console.log('略過不合法交易' + _from_bank + "***" + _to_bank);
                return;
            }


            if(_from_bank == _to_bank ) {

                TransactionMatcher.submitSetTransactionCancelled(s0, "", _rc , "" ,{
                    from: CB_admin,
                    gas: 6000000,
                    privateFor: [
                        eval('key_' + _from_bank),
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

                            } else {
                                console.log('公債交易取消失敗');
                            }
                        });
                    } else {
                        console.log('公債交易取消失敗');
                    }
                });


            }else {


                TransactionMatcher.submitSetTransactionCancelled(s0, "", _rc , "" ,{
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

                            } else {
                                console.log('公債交易取消失敗');
                            }
                        });
                    } else {
                        console.log('公債交易取消失敗');
                    }
                });

            }

        }
    });

    var event5 = PaymentMatcher.EventForPaymentError({some: "_paymentSerNo1"},{fromBlock:eth_v2.blockNumber, toBlock: 'latest' });
    event5.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));

            var ret0 = web3.toAscii(event.args._paymentSerNo1);
            var ret1 = web3.toAscii(event.args._paymentSerNo2);
            //var s2 = event.args.rc;

            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            console.log(esc_red_str+"交易序號："+s0+" "+ " " + s1 +"EventForPaymentError ");

        }
    });

    /*
    //EventForPaymentWaitingForConfirm(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2)
    var event2 = PaymentMatcher.EventForPaymentWaitingForConfirm({some: "_paymentSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event2.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));

            var ret0 = web3.toAscii(event.args._paymentSerNo1);
            var ret1 = web3.toAscii(event.args._paymentSerNo2);

            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txn;

            if(s0.substr(5,1) == "B") {
                txn = ret0;
            }else if(s1.substr(5,1) == "B") {
                txn = ret1;
            }

            var timeout = PaymentMatcher.getPaymentTimeout(txn);

            insertPaymentPair(s0,s1, Math.round(new Date().getTime()/1000), timeout);

            console.log(esc_red_str+"交易序號："+s0+" "+ " " + s1 +"EventForPaymentError ");

        }
    });

    */

    var event6 = TransactionMatcher.EventForSecuritiesTransactionWaitingForPayment({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event6.watch(function(error, event) {
        if (error) {
            // redis_client.set(ret1,'F');
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g, '');
            var s1 = ret1.replace(/\0[\s\S]*$/g, '');

            console.log(esc_red_str + "交易序號：" + ret0 + " EventForSecuritiesTransactionWaitingForPayment" + esc_red_end);
            console.log(esc_red_str + "交易序號：" + ret1 + " EventForSecuritiesTransactionWaitingForPayment" + esc_red_end);

            //var from_bank = ret0.substr(0,5);
            //var to_bank = ret1.substr(0,5);

            var txn;

            /*
            if(s0.substr(5,1) == "B") {
                txn = ret0;
            }else if(s1.substr(5,1) == "B") {
                txn = ret1;
            }
            */

            //var _timeout = PaymentMatcher.getPaymentTimeout(s0);

            //var timeout = _timeout.toString();

            console.log("*"+CC_TIMEOUT);

            insertPaymentPair(s0,s1, Math.round(new Date().getTime()/1000), CC_TIMEOUT);

        }
    });

}else {
    console.log('connect to enode [node2:22000] or geth [8545] failed');
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

server.listen( 3333, function() {
    console.log( 'Listening on port 3333' );
});

router.use( BodyParser.text() );
router.use( cors() );

//_securities_id,  _amount,  _unit_price,  _interest_rateX10K,  _start_tm,  _end_tm,  _period,

router.get( '/cancelTransactions/:from_bank/:to_bank/:txn/:txnstate', function(request, response) {

    var _txn = request.params.txn;
    var _from_bank = request.params.from_bank;
    var _to_bank = request.params.to_bank;
    var _txnstate = request.params.txnstate;

    var _rc;
    var _reason = "";

    if(_txn.charAt(5) == "S") {
        _rc = 6;
    }else {
        _rc = 5;
    }

    console.log("cancel rc = " + _rc);

    PaymentMatcher.submitSetPaymentCancelled(_txn, "", _rc , _reason ,{
        from: eth_v2.accounts[0],
        gas: 3000000,/*
        privateFor: [
            eval('key_' + _from_bank),
            eval('key_' + _to_bank)
        ]
        */
    }, function (err, txhash) {
        if (!err) {
            var theEvent = PaymentMatcher.EventForPaymentCancelled({
                from: eth_v2.accounts[0],
            });
            theEvent.watch(function (err, event) {
                if (!err) {
                    theEvent.stopWatching();
                    var ret0 = web3_v2.toAscii(event.args._paymentSerNo);
                    console.log('公債交易取消完成，交易序號：'+ ret0 );
                    response.end(ret0);
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


function PaymentPair ( _txnseq1, _txnseq2, _timestamp, _timeout) {

    this.txnseq1 = _txnseq1;
    this.txnseq2 = _txnseq2;
    this.timestamp = _timestamp;
    this.timeout = _timeout;
}

function insertPaymentPair( _txnseq1, _txnseq2, _timestamp, _timeout) {

    _txnseq1.replace(/\0[\s\S]*$/g,'');
    _txnseq2.replace(/\0[\s\S]*$/g,'');

    var txn = new PaymentPair ( _txnseq1, _txnseq2 , _timestamp, _timeout);

    dbConnection.collection("payments").insertOne(txn, function (err, res) {
        if (err) {
            console.log("MongoDB Operation ERROR!!!")
            return;
        }
        console.log("1 payment document inserted");
    });

}

function deletePaymentPair(_txnseq1) {

    dbConnection.collection("payments").deleteOne( { "$or" : [{"txnseq1": _txnseq1}, {"txnseq2": _txnseq1}] } , function (err, res) {
        if (err) {
            console.log("MongoDB Operation ERROR!!!")
            return;
        }else {
            console.log("1 payment document deleted");
        }
    });

}


function chkTimeoutAndCancelPayment() {

    console.log("chkTimeoutAndCancelPayment")

    if(typeof dbConnection == "undefined") {
        return;
    }

    console.log("query payments")

    dbConnection.collection("payments").find().toArray(function(err, result) {

        if (err) return;

        for (var i = 0; i < result.length; i++) {

            //console.log("result "+result);
            var _txnseq1 = result[i]["txnseq1"];
            var _txnseq2 = result[i]["txnseq2"];
            var _timestamp = parseInt(result[i]["timestamp"]);
            var _timeout = parseInt(result[i]["timeout"]);

            console.log("_timestamp " + " " + _timestamp + " _timeout " + _timeout);

            var _now =  Math.round(new Date().getTime()/1000);
            var _dur = _now - _timestamp ;

            if(_dur > _timeout) {

                console.log("交易逾時，取消交易" + _txnseq1 + " " + _txnseq2);


                deletePaymentPair(_txnseq1);

                var _rc = 0;
                var _rc2 = 0;

                if(_txnseq1.charAt(5) == "S") {
                    _rc = 6;
                }else {
                    _rc = 5;
                }

                if(_txnseq2.charAt(5) == "S") {
                    _rc2 = 6;
                }else {
                    _rc2 = 5;
                }


                PaymentMatcher.submitSetPaymentCancelled(_txnseq1, "", _rc , "" ,{
                    from: eth_v2.accounts[0],
                    gas: 3000000,/*
                        privateFor: [
                        eval('key_' + _from_bank),
                        eval('key_' + _to_bank)
                    ]
                    */
                }, function (err, txhash) {
                    if (!err) {
                        /*
                        var theEvent = PaymentMatcher.EventForPaymentCancelled({
                            from: eth_v2.accounts[0],
                        });
                        theEvent.watch(function (err, event) {
                            if (!err) {
                                theEvent.stopWatching();
                                var ret0 = web3_v2.toAscii(event.args._paymentSerNo);
                                console.log('款鏈交易取消完成，交易序號：'+ ret0 );
                            } else {
                                console.log('款鏈交易取消失敗');
                            }
                        });
                        */
                    } else {
                        console.log('款鏈交易取消失敗');
                    }
                });


                PaymentMatcher.submitSetPaymentCancelled(_txnseq2, "", _rc2 , "" ,{
                    from: eth_v2.accounts[0],
                    gas: 3000000,/*
                        privateFor: [
                        eval('key_' + _from_bank),
                        eval('key_' + _to_bank)
                    ]
                    */
                }, function (err, txhash) {
                    if (!err) {
                        var theEvent = PaymentMatcher.EventForPaymentCancelled({
                            from: eth_v2.accounts[0],
                        });
                        theEvent.watch(function (err, event) {
                            if (!err) {
                                /*
                                theEvent.stopWatching();
                                var ret0 = web3_v2.toAscii(event.args._paymentSerNo);
                                console.log('款鏈交易取消完成，交易序號：'+ ret0 );
                                */
                            } else {
                                console.log('款鏈交易取消失敗');
                            }

                        });
                    } else {
                        console.log('款鏈交易取消失敗');
                    }
                });



            }
        }

    });

}