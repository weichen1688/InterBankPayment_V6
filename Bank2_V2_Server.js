var Http = require( 'http' ),
    Router = require( 'router' ),
    server,
    router;
router = new Router();

var BodyParser = require('body-parser');
var Promise = require('promise');
var cors = require('cors');
var crypto = require('crypto');
var contractAbi = require('./ContractABI');

var request = require('request');

var MongoClient = require('mongodb').MongoClient;
var MongoDB_URI = "mongodb://localhost:27017";
var dbConnection;

var Process_Mode = "CB"; // 預設處理模式：同資結算

var TEST_AMOUNT = 100;
var TEST_TYPE = "S";  //seller or buyer
var TEST_INTERVAL = 10000;
var TEST_BANK = "Bank4";
var TEST_MODE_ON = "F";
var TEST_MODE = "T1";  // T1: 跨行DVP  T2: 自行DVP  T3: 跨行FOP  T4: 自行FOP
var TEST_FUNCTION = setInterval(autotest1,TEST_INTERVAL);

// To reduce the number of connection pools created by your application,
// we recommend calling MongoClient.connect once and reusing the database variable returned by the callback:
MongoClient.connect(MongoDB_URI, function (err, db) {
    if (err) throw err;
    dbConnection = db.db("bank2");
    console.log("mongodb connected")
});

var Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:22001'));
var eth = web3.eth;

var web3_v2 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
var eth_v2 = web3_v2.eth;


var TransactionMatcherContract = web3.eth.contract(contractAbi.TransactionMatcherAbi);
var TransactionMatcher = TransactionMatcherContract.at(contractAbi.TransactionMatcherAddress);

var PaymentMatcherContract = web3_v2.eth.contract(contractAbi.PaymentMatcherAbi);
var PaymentMatcher = PaymentMatcherContract.at(contractAbi.PaymentMatcherAddress);


var Bank2Contract = web3.eth.contract(contractAbi.BankAbi);
var Bank2 = Bank2Contract.at(contractAbi.Bank2ContractAddress);

var Bank2_admin = '0xca843569e3427144cead5e4d5999a3d0ccf92b8e';

var key_Bank1 = "BULeR8JyUWhiuuCMU/HLA0Q5pzkYT+cHII3ZKBey3Bo="
var key_Bank2 = "QfeDAys9MPDs2XHExtc84jKGHxZg/aj52DTh0vtA3Xc="
var key_Bank3 = "1iTZde/ndBHvzhcl7V68x44Vx7pl8nwx9LqnM/AfJUg="
var key_Bank4 = "oNspPPgszVUFw0qmGFfWwh1uxVUXgvBxleXORHj07g8="
var key_Bank5 = "R56gy4dn24YOjwyesTczYa8m5xhP6hF2uTMCju/1xkY="
var key_Bank6 = "UfNSeSGySeKg11DVNEnqrUtxYRVor4+CvluI8tVv62Y="
var key_Bank7 = "ROAZBWtSacxXQrOe3FGAqJDyJjFePR5ce4TSIzmJ0Bc="


var esc_red_str = "\\033[0;31m ***" + new Date().getTime();
var esc_red_end = "\\033[0m";

var CC_TIMEOUT = 600;

if(web3.isConnected()) {

    console.log('connected to quorum enode [node2:22001], starting event listening ...');

    var event1 = TransactionMatcher.EventForSecuritiesTransactionWaitingForPayment({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event1.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+ new Date().getTime() + "交易序號："+ret0+" EventForSecuritiesTransactionWaitingForPayment"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );
            console.log(esc_red_str+ new Date().getTime() + "交易序號："+ret1+" EventForSecuritiesTransactionWaitingForPayment"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            insertUpdateTxn(s0, "Waiting4Payment", "0" , "", txhash, blocknum);
            insertUpdateTxn(s1, "Waiting4Payment", "0" , "", txhash, blocknum);

            // 跨鏈處理模式
            if(Process_Mode == "EZ") {

                var fields = TransactionMatcher.getTransactionInfo(ret0);

                var f = web3.toAscii(fields[0])
                var frombank = f.replace(/\0[\s\S]*$/g, '');
                var t = web3.toAscii(fields[2])
                var tobank = t.replace(/\0[\s\S]*$/g, '');

                if (frombank != "Bank2") {
                    // 不是賣方，不處理
                    return;

                } else {

                    var seq;

                    if(s0.charAt(5) == 'S') {
                        seq = s0;
                    }else {
                        seq = s1;
                    }

                    var result = dbConnection.collection("paymentsecret").find({"txnseq": seq}).toArray(function (err, result) {

                        if (err) {
                            return;
                        }

                        //console.log(JSON.stringify(result));

                        //console.log("sendToBuyer tobank " + tobank );

                        var _payment_hash = result[0]["paymentHash"] + "";
                        var _payment_secret = result[0]["secret"] + "";

                        if (tobank == "Bank4") {

                            var req = 'http://localhost:3003/sendToBuyer/' + s0 + '/' + s1 + '/' + _payment_hash + '/' + _payment_secret;

                            request.get(req).on('error', function (err) {
                                console.log(err);
                            })

                        } else if (tobank == "Bank5") {

                            var req = 'http://localhost:3004/sendToBuyer/' + s0 + '/' + s1 + '/' + _payment_hash + '/' + _payment_secret;

                            request.get(req).on('error', function (err) {
                                console.log(err);
                            })

                        }

                        console.log("sendToBuyer " + _payment_hash + " " + _payment_secret);
                    });


                }
            }
        }
    });

    var event2 = TransactionMatcher.EventForSecuritiesTransactionFinished({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event2.watch(function(error, event){
        if (error) {
            console.log("Error: " + error);
        } else {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo1);
            var ret1 = web3.toAscii(event.args._txSerNo2);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');
            var s1 = ret1.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;


            console.log(esc_red_str+ new Date().getTime() +"交易序號："+s0+" "+s1+" EventForSecuritiesTransactionFinished"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            insertUpdateTxn(s0, "Finished", "0" , "",txhash, blocknum);
            insertUpdateTxn(s1, "Finished", "0" , "",txhash, blocknum);
        }
    });

    var event3 = TransactionMatcher.EventForSecuritiesTransactionPaymentError({some: "_txSerNo1"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event3.watch(function(error, event){
        if (error) {
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

            console.log(esc_red_str+ new Date().getTime() +"交易序號："+s0+" "+s1+" EventForSecuritiesTransactionPaymentError"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

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

            console.log(esc_red_str+ new Date().getTime() +"交易序號："+s0+" EventForSecuritiesTransactionCancelled"+esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            var _from = s0.substr(0,5);

            if(retA == "3") {


                var fields = TransactionMatcher.getTransactionInfo(ret0);

                var f = web3.toAscii(fields[0])
                var frombank = f.replace(/\0[\s\S]*$/g,'');
                var t = web3.toAscii(fields[2])
                var tobank = t.replace(/\0[\s\S]*$/g,'');

                if(frombank != tobank && frombank == "Bank2") {   //不是賣方節點，不做
                    // 交易面額不足 通知對手行取消交易 取消交易只對Pending跟Waiting4Payment有用 故不會造成loop
                    var txHashB = TransactionMatcher.submitSetTransactionCancelled(s0, "", 3, "", {
                        from: Bank2_admin,
                        gas: 6000000,
                        privateFor: [
                            key_Bank1,
                            eval('key_' + tobank)
                        ]
                    }, function (err, txhash) {
                        if (!err) {

                            console.log("通知對手行取消交易 " + ret0);

                            // 跨鏈處理模式
                            if(Process_Mode == "EZ") {

                                var txHashS = PaymentMatcher.submitSetPaymentCancelled(s0, "", 3, "", {
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
                                        console.log(txhash);
                                        deletePaymentSecret(s0);
                                    } else {
                                        console.log(err);
                                    }
                                });

                            }

                        } else {
                            console.log(err);
                        }
                    });
                }

            }

            insertUpdateTxn(s0, "Cancelled", retA, retB, txhash, blocknum);

        } else {
            console.log(err);
        }
    });

    var event5 = TransactionMatcher.EventForSecuritiesTransactionPending({some: "_txSerNo"},{fromBlock:eth.blockNumber, toBlock: 'latest' });
    event5.watch(function (err, event) {
        if (!err) {
            console.log(event.event + ": " + JSON.stringify(event.args));
            var ret0 = web3.toAscii(event.args._txSerNo);
            var s0 = ret0.replace(/\0[\s\S]*$/g,'');

            var txhash = event.transactionHash;
            var blocknum = event.blockNumber;

            console.log(esc_red_str+ new Date().getTime() +"交易序號："+ s0 + " submitInterBankTransaction ，is Pending" + esc_red_end + " txHash " + txhash + " " + " Block Number " + blocknum );

            insertUpdateTxn(s0, "Pending", "99" , "尚未比對", txhash, blocknum);

        } else {
            console.log(err);
        }
    });


}else {
    console.log('connect to enode [node2:22001] failed');
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
        response.end( 'Bank2 RESTful API is running!' );
    });
});

server.listen( 3001, function() {
    console.log( 'Listening on port 3001' );
});



router.use( BodyParser.text() );
router.use( cors() );


router.get( '/depositDLTBalance/:bank/:acc/:amount', function(request, response) {

    var _bank = request.params.bank;
    var _acc = request.params.acc;
    var _amount = parseInt(request.params.amount);

    console.log("depositDLTBalance " + _acc +" "+ _amount)

    var txHashS = PaymentMatcher.registCustomerCash(_bank, _acc, _amount,
        {
            from: eth_v2.accounts[0],
            gas: 3000000,
            /*
            privateFor: [
                key_Bank1,
                //eval('key_' + from_bank_name),
                eval('key_' + participant)
                //key_Bank6
            ]
            */
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);
                response.end("SUCCESS");
            } else {
                console.log(err);
                response.end(""+err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();

            }
        }
    );

    //emitter.emit('depositCBEvent', _bank);

    response.end("SUCCESS");

});




// submitInterBankTransaction(bytes32 _txSerNo, bytes32 _from_Bank_id, bytes32 _from_customer_id,
// bytes32 _to_Bank_id, bytes32 _to_customer_id, int _securities_amount, bytes32 _securities_id,
//    int _payment, bytes32 _digest)

router.get( '/purchaseBond/Bank2/:type/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment/:rev_txn/:rev_reason', function (request, response) {

    var type = request.params.type; // BUY or SELL
    var frombank = request.params.frombank;
    var fromcustomer = request.params.fromcustomer;
    var tobank = request.params.tobank;
    var tocustomer = request.params.tocustomer;
    var amount = request.params.amount;
    var securities_id = request.params.securities_id;
    var payment = request.params.payment;
    var rev_txnseq = request.params.rev_txn;
    var rev_reason = request.params.rev_reason;

    var is_reverse = false;

    if(rev_txnseq == "N") {
        rev_txnseq = "";
        console.log("一般交易");
    }else {
        is_reverse = true;
        console.log("更正交易"+rev_txnseq);
    }

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq = "Bank2"+ type+ fromcustomer+ ts + nonce;

    var is_seller = false;

    if(type=='S') {
        is_seller = true;
    }

    //var _digest = frombank+fromcustomer+tobank+tocustomer+amount+securities_id+payment;
    var _digest = fromcustomer+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');

    console.log("md5="+md5_digest);
    //console.log(web3.isAddress(to_bank_add));

    console.log(esc_red_str+ new Date().getTime() +"purchaseBond from " + frombank + " " + fromcustomer + " to " + tobank + " " + tocustomer + " amount " +amount +
        " securities_id " + securities_id + " payment " + payment + " txnseq " + txnseq + " rev_txnseq " + rev_txnseq);

    if (frombank == tobank) {
        console.log("轉出行與轉入行不可相同")
        response.end("ERROR");
        return;
    }

    var participant;

    if(frombank == "Bank2") {
        // Bank2 為賣方
        participant = tobank;
    }else {
        participant = frombank;
    }

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);

    console.log("position "+position)
    console.log("amount " + amount)
    console.log("frombank " + frombank)

    var pos = parseInt(position);
    var amt = parseInt(amount);

    if ( amt > pos && frombank == "Bank2" ) {

        console.log("賣方面額不足");

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");

            var command = '/Users/admin/Desktop/InterBankPayment_V6/alert1.sh';

            exec(command, function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        response.end("NOT_ENOUGH_AMOUNT");

        return;
    }

    // 跨鏈處理模式
    if(Process_Mode == "EZ") {

        var cash_position = PaymentMatcher.getCustomerCashPosition(tobank, tocustomer);

        console.log("cash_position "+cash_position)
        console.log("payment "+payment)

        var cash_pos = parseInt(cash_position);
        var cash_payment = parseInt(payment);

        if ( cash_payment > cash_pos && tobank == "Bank2" ) {

            console.log("買方金額不足");

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");

                var command = '/Users/admin/Desktop/InterBankPayment_V6/alert2.sh';

                exec(command, function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();

            response.end("NOT_ENOUGH_CASH");

            return;
        }

    }

    var txHashA = TransactionMatcher.submitInterBankTransaction(txnseq, frombank, fromcustomer, tobank, tocustomer, amount, securities_id, payment, md5_digest, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
                //eval('key_' + from_bank_name),
                eval('key_' + participant)
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {

                // 跨鏈處理模式
                if(Process_Mode == "EZ" ) {

                    var pmt = parseInt(payment);
                    if(pmt == 0) {
                        return;   // FOP
                    }

                    var p_nonce = Math.floor((Math.random() * 10000000));  // 產生secret
                    var payment_nonce = p_nonce + frombank;
                    var payment_md5 = crypto.createHash('md5');
                    var payment_md5_hash = payment_md5.update(payment_nonce).digest('hex');

                    insertPaymentSecret(txnseq, payment_md5_hash, payment_nonce);

                    //function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                    //    bytes32 _to_bank_id, bytes32 _to_customer_id,
                    //    int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)

                    var txHashS = PaymentMatcher.submitInterBankPayment(txnseq, frombank, fromcustomer, tobank, tocustomer, payment, md5_digest,
                        parseInt(CC_TIMEOUT), payment_md5_hash,
                        {
                            from: eth_v2.accounts[0],
                            gas: 3000000,
                            /*
                            privateFor: [
                                key_Bank1,
                                //eval('key_' + from_bank_name),
                                eval('key_' + participant)
                                //key_Bank6
                            ]
                            */
                        }, function (err, txhash) {
                            if (!err) {
                                console.log(txhash);
                                response.end(txnseq);
                            } else {
                                console.log(err);
                                response.end(""+err);

                                var exec = require('child_process').execFile;

                                var fun1 =function(){
                                    console.log("calling Application");
                                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                                        console.log(err)
                                        console.log(data.toString());
                                    });
                                }

                                fun1();

                            }
                        }
                    );


                }else {
                    console.log(txhash);
                    response.end(txnseq);
                }

            } else {
                console.log(err);
                response.end(""+err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();


            }

        }
    );


    if(is_reverse == true) {

        console.log("取消被更正交易："+rev_txnseq+" "+rev_reason);
        var txHashB = TransactionMatcher.submitSetTransactionCancelled(rev_txnseq, txnseq, 7, rev_reason, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
                eval('key_' + participant)
            ]
        }, function (err, txhash) {
            if (!err) {

                if(Process_Mode == "EZ") {

                    var txHashB = PaymentMatcher.submitSetPaymentCancelled(rev_txnseq, txnseq, 7, rev_reason, {
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
                            console.log(txhash);

                            deletePaymentSecret(rev_txnseq);

                            response.end(txnseq);
                        } else {
                            console.log(err);
                            response.end("ERROR");
                        }
                    });


                }else {
                    console.log(txhash);
                    response.end(txnseq);
                }
            } else {
                console.log(err);
                response.end("ERROR");
            }
        });

    }

    console.log('交易進行中，請稍待')

});


router.get( '/purchaseBond_N/Bank2/:type/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment/:rev_txn/:rev_reason', function (request, response) {

    var type = request.params.type;
    var frombank = request.params.frombank;
    var fromcustomer = request.params.fromcustomer;
    var tobank = request.params.tobank;
    var tocustomer = request.params.tocustomer;
    var amount = request.params.amount;
    var securities_id = request.params.securities_id;
    var payment = request.params.payment;

    var rev_txnseq = request.params.rev_txn;
    var rev_reason = request.params.rev_reason;

    var is_reverse = false;

    if(rev_txnseq == "N") {
        rev_txnseq = "";
        console.log("一般交易");
    }else {
        is_reverse = true;
        console.log("更正交易"+rev_txnseq);
    }

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq = "Bank2"+ type+ fromcustomer+ ts + nonce;

    var is_seller = false;

    if(type=='S') {
        is_seller = true;
    }

    var _digest = frombank+fromcustomer+tobank+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');

    console.log(md5_digest);

    //console.log(web3.isAddress(to_bank_add));

    //function submitIntraBankTransaction(bytes32 _txSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
    // bytes32 _to_customer_id, int _securities_amount, bytes32 _securities_id,
    //    int _payment, bytes32 _digest, bytes32 _rev_txSerNo)

    console.log("purchaseBond_N from " + frombank + " " + fromcustomer + " to " + tobank + " " + tocustomer + " amount " +amount +
        " securities_id " + securities_id + " payment " + payment + " txnseq " + txnseq + " rev_txnseq" + rev_txnseq + " rev_reason" + rev_reason);

    if (frombank != tobank) {
        console.log("轉出行與轉入行必須相同")
        response.end("ERROR");
        return;
    }

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);
    if (amount > position && type == 'S') {

        console.log("賣方面額不足");

        /*

        if(frombank == "Bank2") {   //不是賣方節點，不做
            // 交易面額不足 通知對手行取消交易 取消交易只對Pending跟Waiting4Payment有用 故不會造成loop
            var txHashB = TransactionMatcher.submitSetTransactionCancelled(txnseq, "", 30 , "", {
                from: Bank2_admin,
                gas: 6000000,
                privateFor: [
                    key_Bank1,
                    // eval('key_' + tobank)
                ]
            }, function (err, txhash) {
                if (!err) {
                    console.log("通知取消買方交易");
                    response.end("ERROR");
                } else {
                    console.log(err);
                    response.end("ERROR");
                }
            });
        }

        */

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");
            exec('/Applications/NotifyCancelled.app/Contents/MacOS/applet', function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        response.end("NOT_ENOUGH_AMOUNT");

        return;
    }


    if(Process_Mode == "EZ") {

        var cash_position = PaymentMatcher.getCustomerCashPosition(tobank, tocustomer);

        console.log("cash_position "+cash_position)
        console.log("payment "+payment)

        var cash_pos = parseInt(cash_position);
        var cash_payment = parseInt(payment);

        if ( cash_payment > cash_pos && tobank == "Bank2" ) {

            console.log("買方金額不足");

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");

                var command = '/Users/admin/Desktop/InterBankPayment_V6/alert2.sh';

                exec(command, function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();

            response.end("NOT_ENOUGH_CASH");

            return;
        }

    }


    var txHashA = TransactionMatcher.submitIntraBankTransaction(txnseq, frombank, fromcustomer, tocustomer, amount, securities_id, payment, md5_digest,  {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
                //eval('key_' + from_bank_name),
                //eval('key_' + to_bank_name),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {

                if(Process_Mode == "EZ") {

                    var pmt = parseInt(payment);
                    if(pmt == 0) {
                        return;   // FOP
                    }

                    var payment_nonce = Math.floor((Math.random() * 10000000));  // 產生secret
                    var payment_md5 = crypto.createHash('md5');
                    var payment_md5_hash = payment_md5.update(payment_nonce).digest('hex');

                    insertPaymentSecret(txnseq, payment_md5_hash, payment_nonce);

                    //function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                    //    bytes32 _to_bank_id, bytes32 _to_customer_id,
                    //    int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)

                    var txHashS = PaymentMatcher.submitInterBankPayment(txnseq, frombank, fromcustomer, tobank, tocustomer, payment, md5_digest,
                        parseInt(CC_TIMEOUT), payment_md5_hash,
                        {
                            from: eth_v2.accounts[0],
                            gas: 3000000,
                            /*
                            privateFor: [
                                key_Bank1,
                                //eval('key_' + from_bank_name),
                                eval('key_' + participant)
                                //key_Bank6
                            ]
                            */
                        }, function (err, txhash) {
                            if (!err) {
                                console.log(txhash);
                                response.end(txnseq);
                            } else {
                                console.log(err);
                                response.end(""+err);

                                var exec = require('child_process').execFile;

                                var fun1 =function(){
                                    console.log("calling Application");
                                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                                        console.log(err)
                                        console.log(data.toString());
                                    });
                                }

                                fun1();

                            }
                        }
                    );

                }else {
                    console.log(txhash);
                    response.end(txnseq);
                }
            } else {
                console.log(err);
                response.end(""+ err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();

            }

        }
    );


    if(is_reverse == true) {

        console.log("取消被更正交易："+rev_txnseq + " " + rev_reason);
        var txHashB = TransactionMatcher.submitSetTransactionCancelled(rev_txnseq, txnseq, 7, rev_reason, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
            ]
        }, function (err, txhash) {
            if (!err) {

                if(Process_Mode == "EZ") {

                    var txHashB = PaymentMatcher.submitSetPaymentCancelled(rev_txnseq, txnseq, 7, rev_reason, {
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
                            console.log(txhash);
                            response.end(txnseq);
                        } else {
                            console.log(err);
                            response.end("ERROR");
                        }
                    });

                }else {
                    console.log(txhash);
                    response.end(txnseq);
                }
            } else {
                console.log(err);
                response.end("ERROR");
            }
        });

    }

    console.log('交易進行中，請稍待')

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


/*
router.get( '/checkTxnInfo/Bank2/:txnseq', function (request, response) {

    var txnseq = request.params.txnseq;

    //console.log(web3.isAddress(to_bank_add));

    console.log("/checkTxnInfo/Bank2/:checkTxnInfo " + txnseq);

    var fields = TransactionMatcher.getTransactionInfo(txnseq);

    //return(this_txn.from_bank_id, this_txn.from_customer_id,
    //this_txn.to_bank_id, this_txn.to_customer_id,
    //    this_txn.securities_amount, this_txn.securities_id, this_txn.payment, this_txn.timestamp
    //);


    //function Transaction ( txnseq, from_bank, from_customer, to_bank, to_customer, amount, securities_id, payment, timestamp,
    //                       txnstate

    var from_bank = web3.toAscii(fields[0])
    var from_customer = web3.toAscii(fields[1])
    var to_bank = web3.toAscii(fields[2])
    var to_customer = web3.toAscii(fields[3])
    var securities_amount = fields[4]
    var securities_id  = web3.toAscii(fields[5])
    var payment  = fields[6]
    var timestamp  = fields[7]
    //var rev_txnSerNo = fields[8]

    var field_r = TransactionMatcher.getTransactionReverseTxnSeq(txnseq);
    var rev_txnSerNo = web3.toAscii(field_r);

    console.log(rev_txnSerNo);

    if(rev_txnSerNo.length<5 || rev_txnSerNo.substr(0,4) != "Bank") {
        rev_txnSerNo = "NA";
    }

    //var d = new Date();
    //var s_time = new Date(timestamp * 1000 + d.getTimezoneOffset() * 60000)

    var fields_2 = TransactionMatcher.getTransactionState(txnseq);
    var state;
    var err_code;

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

    if( fields_2[1] == "0") {
        err_code="";
    }else if(fields_2[1] == "1") {
        err_code="";
    }else if(fields_2[1] == "2") {
        err_code="自行賣方券數不足";
    }else if(fields_2[1] == "3") {
        err_code="跨行賣方券數不足";
    }else if(fields_2[1] == "4") {
        err_code="";
    }else if(fields_2[1] == "5") {
        err_code="交易被取消";
    }else {
        err_code="同資錯誤"+fields_2[1];
    }

    var result = txnseq  +
        ' ' + from_bank  +
        ' ' + from_customer  +
        ' ' + to_bank +
        ' ' + to_customer +
        ' ' + securities_amount +
        ' ' + securities_id +
        ' ' + payment +
        ' ' + timestamp +
        ' ' + state +
        ' ' + rev_txnSerNo +
        ' ' + err_code;

    console.log("交易查詢：" + result);

    response.end(result);

});
*/

/*
router.get( '/checkTxn/:txnseq', function (request, response) {

    var txseq = request.params.txnseq;

    redis_client.get(txseq, function (err, data) {
        if(!err) {
            console.log("checkTxn txnseq ",data);
            response.end(data);
        }else {
            console.log("checkTxn err");
            response.end("Error");
        }
    });
});
*/


router.get( '/switchMode/:bank/:mode/:timeout', function(request, response) {

    var _bank = request.params.bank;
    var _mode = request.params.mode;
    var _timeout = request.params.timeout;

    console.log("switchMode "+_bank+" "+_mode + " " +_timeout);

    Process_Mode =  _mode;

    response.end("SUCCESS");

});


router.get( '/testMode/:mode/:bank/:type/:interval/:is_on', function(request, response) {

    TEST_MODE = request.params.mode;
    TEST_TYPE = request.params.type;
    TEST_BANK = request.params.bank;
    TEST_INTERVAL  = request.params.interval;
    TEST_MODE_ON = request.params.is_on;

    console.log("testMode "+ TEST_MODE + " " + TEST_TYPE + " " + TEST_BANK + " " + TEST_INTERVAL + " " +TEST_MODE_ON);

    clearInterval(TEST_FUNCTION);

    if(TEST_MODE == "T1") {
        TEST_AMOUNT = 100;
        TEST_FUNCTION = setInterval(autotest1,TEST_INTERVAL);
    }else if(TEST_MODE == "T2") {
        TEST_AMOUNT = 100;
        TEST_FUNCTION = setInterval(autotest2,TEST_INTERVAL);
    }else if(TEST_MODE == "T3") {
        TEST_AMOUNT = 100;
        TEST_FUNCTION = setInterval(autotest3,TEST_INTERVAL);
    }else if(TEST_MODE == "T4") {
        TEST_AMOUNT = 100;
        TEST_FUNCTION = setInterval(autotest4,TEST_INTERVAL);
    }

    response.end("SUCCESS");

});



router.get( '/checkAccBal/:securities_id/:bank_id/:cust_id', function (request, response) {

    var securities_id = request.params.securities_id;
    var bank_id = request.params.bank_id;
    var cust_id = request.params.cust_id;

    var data = TransactionMatcher.getCustomerSecuritiesAmount(securities_id, bank_id, cust_id);
    var amt = JSON.stringify(data);

    var fields = TransactionMatcher.getSecuritiesInfo(securities_id);
    var interest = fields[0];
    var start_day = fields[1];
    var end_day = fields[2];

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, bank_id, cust_id);

    var fields2 = Bank2.getCustomerInfo(cust_id);

    var cust_name = fields2[0];
    var cust_type = fields2[1];

    var ret = amt + " " + interest + " " + start_day + " " + end_day + " " + position + " " + cust_name + " " + cust_type;
    console.log(ret);
    response.end(ret);

});


router.get( '/checkBanner/:securities_id/:bank_id/:cust_id', function (request, response) {

    var _sec_id = request.params.securities_id;
    var _bank_id = request.params.bank_id;
    var _cust_id = request.params.cust_id;;

    var fields = Bank2.getCustomerSecuritiesInterest(_sec_id, _cust_id);
    var interest = JSON.stringify(fields[0]);
    //var upd_ts = JSON.stringify(fields[1]);


    var data2 = TransactionMatcher.getCustomerSecuritiesAmount(_sec_id, _bank_id, _cust_id);
    var totalamt = JSON.stringify(data2);

    var data3 = Bank2.getLastPaidInterest(_sec_id, _cust_id);
    var last_interest = JSON.stringify(data3);

    var _block = web3.eth.blockNumber;
    var _nonce = web3.eth.getTransactionCount(Bank2_admin);

    var ret;

    if(Process_Mode == "EZ") {

        var dlt_balance = PaymentMatcher.getCustomerCashAmount(_bank_id, _cust_id)
        var dlt_position = PaymentMatcher.getCustomerCashPosition(_bank_id, _cust_id)

        ret = "*** " + addComma(dlt_balance) + '/' + addComma(dlt_position) + " " + interest + " " + totalamt + " " +last_interest;

    }else {
        ret = _block + " " + _nonce + " " + interest + " " + totalamt + " " +last_interest;
    }

    console.log(ret);
    response.end(ret);

});

router.get( '/unlockAccount/:passwd/:period', function (request, response) {
    var _passwd = request.params.passwd;
    var _period = parseInt(request.params.period);

    if(_passwd == "password") {
        _passwd = "";
    }

    var isUnlocked = web3.personal.unlockAccount(Bank2_admin, _passwd, _period);

    if(isUnlocked) {
        console.log("解鎖成功");
        response.end("解鎖成功");
    }else {
        console.log("解鎖失敗");
        response.end("解鎖失敗");
    }
});

router.get( '/lockAccount', function (request, response) {
    web3.personal.lockAccount(Bank2_admin);
    console.log("lockAccount");
    response.end("OK");
});


router.get( '/sendToBuyer/:txnseq1/:txnseq2/:payment_hash/:payment_secret', function (request, response) {

    var _txnseq1 = request.params.txnseq1;
    var _txnseq2 = request.params.txnseq2;
    var _payment_hash = request.params.payment_hash;
    var _payment_secret = request.params.payment_secret;

    console.log("/sendToBuyer/" + _txnseq1 + "/" + _txnseq2 + "/" + _payment_hash + "/" + _payment_secret);

    var payment_md5 = crypto.createHash('md5');
    var payment_md5_hash = payment_md5.update(_payment_secret).digest('hex');

    if(payment_md5_hash == _payment_hash) {
        console.log("驗證 y=H(x) 完成");
    }else {
        console.log("驗證 y=H(x) 失敗")
        return;
    }

    //submitSetPaymentConfirmed(bytes32 _paymentSerNo1, bytes32 _paymentSerNo2, bytes32 _paymentHash, bytes32 _secret)
    var txHashB = PaymentMatcher.submitSetPaymentConfirmed(_txnseq1, _txnseq2, _payment_hash , _payment_secret, {
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
            console.log(txhash);
            response.end(_txnseq1);
        } else {
            console.log(err);
            response.end("ERROR");
        }
    });

});

router.get( '/cancelTransaction/:frombank/:tobank/:txn', function (request, response) {

    var txn = request.params.txn;
    var _from_bank = request.params.frombank;
    var _to_bank = request.params.tobank;
    var participant;

    if(_from_bank=="Bank2") {
        participant = _to_bank;
    }else {
        participant = _from_bank;
    }

    var _rc;
    var _rc2;

    if(txn.charAt(5) == "S") {
        _rc = 5;
        _rc2 = 6;
    }else {
        _rc = 6;
        _rc2 = 5;
    }


    if(_from_bank=="Bank2" && _to_bank == "Bank2") {

        TransactionMatcher.submitSetTransactionCancelled(txn, "", _rc, "", {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
            ]
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);
                response.end(txn);

                if (Process_Mode == "EZ") {

                    var txHashB = PaymentMatcher.submitSetPaymentCancelled(txn, "", _rc2, "", {
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
                            console.log(txhash);

                            deletePaymentSecret(txn);

                            response.end(txn);
                        } else {
                            console.log(err);
                            response.end("ERROR");
                        }
                    });
                }
            } else {
                console.log(err);
                response.end("ERROR");
            }
        });

    }else {

        TransactionMatcher.submitSetTransactionCancelled(txn, "", _rc, "", {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
                eval('key_' + participant),
            ]
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);
                response.end(txn);

                if (Process_Mode == "EZ") {

                    var txHashB = PaymentMatcher.submitSetPaymentCancelled(txn, "", _rc2, "", {
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
                            console.log(txhash);

                            deletePaymentSecret(txn);

                            response.end(txn);
                        } else {
                            console.log(err);
                            response.end("ERROR");
                        }
                    });
                }
            } else {
                console.log(err);
                response.end("ERROR");
            }
        });
    }
});


router.get( '/setCustomerInfo/Bank2/:cust_id/:cust_name/:cust_type', function (request, response) {

    var _bank_id = "Bank2";
    var _cust_id = request.params.cust_id;
    var _cust_name = request.params.cust_name;
    var _cust_type = request.params.cust_type;

    //  function setCustomerInfo(bytes32 _bank_id, bytes32 _customer_id, bytes32 _customer_name, bytes32 _customer_type) onlyOwner {
    Bank2.setCustomerInfo(_cust_id, _cust_name, _cust_type, {
        from: Bank2_admin,
        gas: 6000000,
        privateFor: [
            key_Bank1,
        ]
    }, function (err, txhash) {
        if (!err) {

            var theEvent = Bank2.EventForSetCustomerInfo({
                from: Bank2_admin,
            });
            theEvent.watch(function (err, event) {
                if (!err) {
                    theEvent.stopWatching();

                    //console.log(event.event + ": " + JSON.stringify(event.args));
                    //var ret0 = web3.toAscii(event.args._bank_id);
                    var ret1 = web3.toAscii(event.args._customer_id);
                    console.log("設定帳戶資料成功:"+ret1);
                    console.log(txhash);
                    response.end(ret1);

                } else {
                    console.log(err);
                    response.end("ERROR");
                }
            });
        } else {
            console.log(err);
            response.end("ERROR");
        }
    });

});


router.get( '/checkBLockNumber', function (request, response) {
    response.end(web3.eth.blockNumber);
});

router.get( '/checkNonce/:acc', function (request, response) {
    var acc = request.params.acc;
    response.end(web3.eth.getTransactionCount(acc));
});


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

    this.causer = causer;

    /*
    if(causer == "E1") {
        this.causer = "面額輸入錯誤";
    }else if(causer == "E2") {
        this.causer = "金額輸入錯誤";
    }else if(causer == "E3") {
        this.causer = "公債代號輸入錯誤";
    }else if(causer == "E4") {
        this.causer = "轉出方銀行輸入錯誤";
    }else if(causer == "E5") {
        this.causer = "轉出方帳號輸入錯誤";
    }else if(causer == "E6") {
        this.causer = "轉入方銀行輸入錯誤";
    }else if(causer == "E7") {
        this.causer = "轉入方帳號輸入錯誤";
    }else if(causer == "E0") {
        this.causer = "";
    }else {

    }
    */

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
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash1 : txn_hash, blocknum1 : block_number  } };
            }else if(status == "Waiting4Payment") {
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash2 : txn_hash, blocknum2 : block_number  } };
            }else if(status == "Finished") {
                newvalues = { $set: { txnstate: status, rev_txnseq : s9, causer : err_code, txhash3 : txn_hash, blocknum3 : block_number  } };
            }else if(status == "Cancelled") {
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

    htmlstr = '<ul class="list list-timeline pull-t">';


    if(_txhash1!="NA" && _blocknum1!="NA") {
        txnJson1 = web3.eth.getTransactionReceipt(_txhash1);
        //txnJson1 = web3.eth.getBlock(_blocknum1);
        delete txnJson1["logs"];
        delete txnJson1["logsBloom"];
        delete txnJson1["contractAddress"];
        //txnJson1["txnseq"] = _txnseq;

        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson1);
        //blockJson1 = web3.eth.getBlock(_blocknum1);

        htmlstr += '<li><div class="list-timeline-time">';
        htmlstr += 'Block '+ _blocknum1 +
            '</div><i class="fa fa-database list-timeline-icon bg-smooth"></i>' +
            '        <div class="list-timeline-content">' +
            '        <p class="font-w600">';
        htmlstr += '狀態 [ Pending ]<br/>';
        htmlstr += addNewLine(tmpstr,90) + '</p></div></li>';

        cnt++;
    }

    if(_txhash2!=="NA" && _blocknum2!="NA") {
        txnJson2 = web3.eth.getTransactionReceipt(_txhash2);
        //txnJson2 = web3.eth.getBlock(_blocknum2);
        delete txnJson2["logs"];
        delete txnJson2["logsBloom"];
        delete txnJson2["contractAddress"];
        //txnJson2["txnseq"] = _txnseq;
        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson2);
        //blockJson1 = web3.eth.getBlock(_blocknum1);

        htmlstr += '<li><div class="list-timeline-time">';
        htmlstr += 'Block '+ _blocknum2;

        htmlstr +=
            '</div><i class="fa fa-database list-timeline-icon bg-smooth"></i>' +
            '        <div class="list-timeline-content">' +
            '        <p class="font-w600">';

        if(cnt == 0) {
            htmlstr += '狀態 [ Pending ] <br/> [ Waiting4Payment ] <br/>'
        }
        else {
            htmlstr += '狀態 [ Waiting4Payment ] <br/>'
        }

        htmlstr += addNewLine(tmpstr,90) + '</p></div></li>';

        cnt++;
    }

    if(_txhash3!="NA" && _blocknum3!="NA") {
        txnJson3 = web3.eth.getTransactionReceipt(_txhash3);
        //txnJson3 = web3.eth.getBlock(_blocknum3);
        delete txnJson3["logs"];
        delete txnJson3["logsBloom"];
        delete txnJson3["contractAddress"];
        //txnJson3["txnseq"] = _txnseq;

        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson3);
        //blockJson1 = web3.eth.getBlock(_blocknum1);

        htmlstr += '<li><div class="list-timeline-time">';
        htmlstr += 'Block '+ _blocknum3;

        htmlstr +=
           '</div><i class="fa fa-database list-timeline-icon bg-smooth"></i>' +
           '        <div class="list-timeline-content">' +
           '        <p class="font-w600">';

        if(cnt == 0) {
            htmlstr += '狀態 [ Pending ] <br/> [ Finished ] <br/>'
        }
        else {
            htmlstr += '狀態 [ Finished ] <br/>'
        }

        htmlstr += addNewLine(tmpstr,90) + '</p></div></li>';

        cnt++;
    }

    if(_txhash4!="NA" && _blocknum4!="NA") {
        txnJson4 = web3.eth.getTransactionReceipt(_txhash4);
        //txnJson4 = web3.eth.getBlock(_blocknum4);
        delete txnJson4["logs"];
        delete txnJson4["logsBloom"];
        delete txnJson4["contractAddress"];
        //txnJson4["txnseq"] = _txnseq;

        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson4);
        //blockJson1 = web3.eth.getBlock(_blocknum1);

        htmlstr += '<li><div class="list-timeline-time">';
        htmlstr += 'Block '+ _blocknum4 +
            '</div><i class="fa fa-database list-timeline-icon bg-smooth"></i>' +
            '        <div class="list-timeline-content">' +
            '        <p class="font-w600">';
        htmlstr += '狀態 [ Cancelled ]<br/>';
        htmlstr += addNewLine(tmpstr,90) + '</p></div></li>';

        cnt++;
    }

    if(_txhash5!="NA" && _blocknum5!="NA") {
        txnJson5 = web3.eth.getTransactionReceipt(_txhash5);
        //txnJson5 = web3.eth.getBlock(_blocknum5);
        delete txnJson5["logs"];
        delete txnJson5["logsBloom"];
        delete txnJson5["contractAddress"];
        // txnJson5["txnseq"] = _txnseq;
        var tmpstr = ' "txnseq":"'+ _txnseq + '"' + JSON.stringify(txnJson5);
        //blockJson1 = web3.eth.getBlock(_blocknum1);

        htmlstr += '<li><div class="list-timeline-time">';
        htmlstr += 'Block '+ _blocknum5 +
            '</div><i class="fa fa-database list-timeline-icon bg-smooth"></i>' +
            '        <div class="list-timeline-content">' +
            '        <p class="font-w600">';
        htmlstr += '狀態 [ PaymentError ]<br/>';
        htmlstr += addNewLine(tmpstr,90) + '</p></div></li>';

        cnt++;
    }

    htmlstr += '</ul>';

    console.log(htmlstr);

    response.end(htmlstr);


});


function PaymentSecret(_txnseq, _paymentHash, _secret) {

    this.txnseq = _txnseq;
    this.paymentHash = _paymentHash;
    this.secret = _secret;
}


function insertPaymentSecret(_txnseq, _paymentHash, _secret) {

    var txn = new PaymentSecret(_txnseq, _paymentHash, _secret);
    //var _payment = parseInt(_balance);

    //eval(_bank+"_Balance=parseInt("+ _bank +"_Balance) + parseInt(_balance)");

    console.log("PaymentSecret " + _txnseq + " " + _paymentHash +" " + _secret);

    dbConnection.collection("paymentsecret").find({"txnseq": _txnseq}).toArray(function(err, result) {
        if (err) throw err;
        //console.log(JSON.stringify(result));
        if(result.length == 0) {
            dbConnection.collection("paymentsecret").insertOne(txn, function (err, res) {
                if (err) {
                    console.log("MongoDB Operation ERROR!!!")
                    return;
                }
                console.log("1 paymentsecret document inserted");
                //settleFailedTransaction(_bank);
            });

        }
    });

}

function deletePaymentSecret(_txnseq) {

    dbConnection.collection("paymentsecret").deleteOne( {"txnseq": _txnseq} , function (err, res) {
        if (err) {
            console.log("MongoDB Operation ERROR!!!")
            return;
        }else {
            console.log("1 paymentsecret document deleted");
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

function addComma(number) {

    var num = number.toString();
    var pattern = /(-?\d+)(\d{3})/;

    while(pattern.test(num))
    {
        num = num.replace(pattern, "$1,$2");
    }
    return num;
}


function autotest1() {

    if(TEST_MODE != "T1" || TEST_MODE_ON!="T") {
        return;
    }

    TEST_AMOUNT++;

    var type = TEST_TYPE; // BUY or SELL

    var frombank;
    var fromcustomer;
    var tobank;
    var tocustomer;

    if(type == "B") {
        frombank = TEST_BANK;
        if(TEST_BANK == "Bank4") {
            fromcustomer = "004-000-00001";
        }else if(TEST_BANK == "Bank5") {
            fromcustomer = "005-000-00001";
        }
        tobank = "Bank2";
        tocustomer = "002-000-00001";
    }else {
        tobank = TEST_BANK;
        if(TEST_BANK == "Bank4") {
            tocustomer = "004-000-00001";
        }else if(TEST_BANK == "Bank5") {
            tocustomer = "005-000-00001";
        }
        frombank = "Bank2";
        fromcustomer = "002-000-00001";
    }

    var amount = TEST_AMOUNT;
    var securities_id = "A07101";
    var payment = TEST_AMOUNT;

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq = "Bank2"+ type+ fromcustomer+ ts + nonce;

    var _digest = fromcustomer+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');


    var participant;

    if(frombank == "Bank2") {
        // Bank2 為賣方
        participant = tobank;
    }else {
        participant = frombank;
    }

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);

    console.log("position "+position)
    console.log("amount " + amount)
    console.log("frombank " + frombank)

    var pos = parseInt(position);
    var amt = parseInt(amount);

    if ( amt > pos && frombank == "Bank2" ) {

        console.log("賣方面額不足");

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");

            var command = '/Users/admin/Desktop/InterBankPayment_V6/alert1.sh';

            exec(command, function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        return;
    }

    // 跨鏈處理模式
    if(Process_Mode == "EZ") {

        var cash_position = PaymentMatcher.getCustomerCashPosition(tobank, tocustomer);

        console.log("cash_position "+cash_position)
        console.log("payment "+payment)

        var cash_pos = parseInt(cash_position);
        var cash_payment = parseInt(payment);

        if ( cash_payment > cash_pos && tobank == "Bank2" ) {

            console.log("買方金額不足");

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");

                var command = '/Users/admin/Desktop/InterBankPayment_V6/alert2.sh';

                exec(command, function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();

            return;
        }

    }

    var txHashA = TransactionMatcher.submitInterBankTransaction(txnseq, frombank, fromcustomer, tobank, tocustomer, amount, securities_id, payment, md5_digest, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
                eval('key_' + participant),
                //eval('key_Bank4')
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {

                // 跨鏈處理模式
                if(Process_Mode == "EZ") {

                    var p_nonce = Math.floor((Math.random() * 10000000));  // 產生secret
                    var payment_nonce = p_nonce + frombank;
                    var payment_md5 = crypto.createHash('md5');
                    var payment_md5_hash = payment_md5.update(payment_nonce).digest('hex');

                    insertPaymentSecret(txnseq, payment_md5_hash, payment_nonce);

                    //function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                    //    bytes32 _to_bank_id, bytes32 _to_customer_id,
                    //    int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)

                    var txHashS = PaymentMatcher.submitInterBankPayment(txnseq, frombank, fromcustomer, tobank, tocustomer, payment, md5_digest,
                        parseInt(CC_TIMEOUT), payment_md5_hash,
                        {
                            from: eth_v2.accounts[0],
                            gas: 3000000,
                            /*
                            privateFor: [
                                key_Bank1,
                                //eval('key_' + from_bank_name),
                                eval('key_' + participant)
                                //key_Bank6
                            ]
                            */
                        }, function (err, txhash) {
                            if (!err) {
                                console.log(txhash);
                            } else {
                                console.log(err);

                                var exec = require('child_process').execFile;

                                var fun1 =function(){
                                    console.log("calling Application");
                                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                                        console.log(err)
                                        console.log(data.toString());
                                    });
                                }

                                fun1();

                            }
                        }
                    );


                }else {
                    console.log(txhash);
                }

            } else {
                console.log(err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();


            }

        }
    );


}


function autotest2() {

    if(TEST_MODE != "T2" || TEST_MODE_ON!="T") {
        return;
    }

    TEST_AMOUNT++;

    // var type = TEST_TYPE; // BUY or SELL doesnt matter
    var frombank = "Bank2";
    var fromcustomer = "002-000-00001";
    var tobank = "Bank2";
    var tocustomer = "002-000-00002";
    var amount = TEST_AMOUNT;
    var securities_id = "A07101";
    var payment = TEST_AMOUNT;

    //var rev_txnseq = "";
    //var rev_reason = "";
    //var is_reverse = false;

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq_1 = "Bank2S"+ fromcustomer+ ts + nonce;
    var txnseq_2 = "Bank2B"+ fromcustomer+ ts + nonce;

    var _digest = frombank+fromcustomer+tobank+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');

    console.log(md5_digest);


    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);
    if (amount > position) {

        console.log("賣方面額不足");

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");
            exec('/Applications/NotifyCancelled.app/Contents/MacOS/applet', function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        response.end("NOT_ENOUGH_AMOUNT");

        return;
    }

    if(Process_Mode == "EZ") {

        var cash_position = PaymentMatcher.getCustomerCashPosition(tobank, tocustomer);

        console.log("cash_position "+cash_position)
        console.log("payment "+payment)

        var cash_pos = parseInt(cash_position);
        var cash_payment = parseInt(payment);

        if ( cash_payment > cash_pos && tobank == "Bank2" ) {

            console.log("買方金額不足");

            var exec = require('child_process').execFile;

            var fun1 =function(){
                console.log("calling Application");

                var command = '/Users/admin/Desktop/InterBankPayment_V6/alert2.sh';

                exec(command, function(err, data) {
                    console.log(err)
                    console.log(data.toString());
                });
            }

            fun1();

            return;
        }

    }


    var txHashA = TransactionMatcher.submitIntraBankTransaction(txnseq_1, frombank, fromcustomer, tocustomer, amount, securities_id, payment, md5_digest,  {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
                //eval('key_' + from_bank_name),
                //eval('key_' + to_bank_name),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {

                func3();

                console.log(txhash);
            } else {
                console.log(err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();

            }

        }
    );

    console.log('交易進行中，請稍待')


    setTimeout(func2,5000);

    function func2() {

        var txHashA = TransactionMatcher.submitIntraBankTransaction(txnseq_2, frombank, fromcustomer, tocustomer, amount, securities_id, payment, md5_digest,  {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
                //eval('key_' + from_bank_name),
                //eval('key_' + to_bank_name),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {

                func4();

                console.log(txhash);
            }else {
                console.log(err);

                var exec = require('child_process').execFile;

                var funA =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                funA();

            }
        });

    }


    function func3() {

        if(Process_Mode == "EZ") {

            var payment_nonce = Math.floor((Math.random() * 10000000));  // 產生secret
            var payment_md5 = crypto.createHash('md5');
            var payment_md5_hash = payment_md5.update(payment_nonce).digest('hex');

            insertPaymentSecret(txnseq_1, payment_md5_hash, payment_nonce);

            //function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
            //    bytes32 _to_bank_id, bytes32 _to_customer_id,
            //    int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)

            var txHashS = PaymentMatcher.submitInterBankPayment(txnseq_1, frombank, fromcustomer, tobank, tocustomer, payment, md5_digest,
                parseInt(CC_TIMEOUT), payment_md5_hash,
                {
                    from: eth_v2.accounts[0],
                    gas: 3000000,
                    /*
                    privateFor: [
                        key_Bank1,
                        //eval('key_' + from_bank_name),
                        eval('key_' + participant)
                        //key_Bank6
                    ]
                    */
                }, function (err, txhash) {
                    if (!err) {
                        console.log(txhash);
                    } else {
                        console.log(err);

                        var exec = require('child_process').execFile;

                        var fun1 =function(){
                            console.log("calling Application");
                            exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                                console.log(err)
                                console.log(data.toString());
                            });
                        }

                        fun1();

                    }
                }
            );

        }
    }


    function func4() {
        function func3() {

            if(Process_Mode == "EZ") {

                var payment_nonce = Math.floor((Math.random() * 10000000));  // 產生secret
                var payment_md5 = crypto.createHash('md5');
                var payment_md5_hash = payment_md5.update(payment_nonce).digest('hex');

                insertPaymentSecret(txnseq_2, payment_md5_hash, payment_nonce);

                //function submitInterBankPayment(bytes32 _paymentSerNo, bytes32 _from_bank_id, bytes32 _from_customer_id,
                //    bytes32 _to_bank_id, bytes32 _to_customer_id,
                //    int _payment, bytes32 _digest, uint _timeout, bytes32 _paymentHash)

                var txHashS = PaymentMatcher.submitInterBankPayment(txnseq_2, frombank, fromcustomer, tobank, tocustomer, payment, md5_digest,
                    parseInt(CC_TIMEOUT), payment_md5_hash,
                    {
                        from: eth_v2.accounts[0],
                        gas: 3000000,
                        /*
                        privateFor: [
                            key_Bank1,
                            //eval('key_' + from_bank_name),
                            eval('key_' + participant)
                            //key_Bank6
                        ]
                        */
                    }, function (err, txhash) {
                        if (!err) {
                            console.log(txhash);
                        } else {
                            console.log(err);

                            var exec = require('child_process').execFile;

                            var fun1 =function(){
                                console.log("calling Application");
                                exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                                    console.log(err)
                                    console.log(data.toString());
                                });
                            }

                            fun1();

                        }
                    }
                );

            }
        }

    }

}



function autotest3() {

    if(TEST_MODE != "T3" || TEST_MODE_ON!="T") {
        return;
    }

    TEST_AMOUNT++;

    var type = TEST_TYPE; // BUY or SELL

    var frombank;
    var fromcustomer;
    var tobank;
    var tocustomer;

    if(type == "B") {
        frombank = TEST_BANK;
        if(TEST_BANK == "Bank4") {
            fromcustomer = "004-000-00001";
        }else if(TEST_BANK == "Bank5") {
            fromcustomer = "005-000-00001";
        }
        tobank = "Bank2";
        tocustomer = "002-000-00001";
    }else {
        tobank = TEST_BANK;
        if(TEST_BANK == "Bank4") {
            tocustomer = "004-000-00001";
        }else if(TEST_BANK == "Bank5") {
            tocustomer = "005-000-00001";
        }
        frombank = "Bank2";
        fromcustomer = "002-000-00001";
    }


    var amount = TEST_AMOUNT;
    var securities_id = "A07101";
    var payment = 0;

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq = "Bank2"+ type+ fromcustomer+ ts + nonce;

    var _digest = fromcustomer+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');


    var participant;

    if(frombank == "Bank2") {
        // Bank2 為賣方
        participant = tobank;
    }else {
        participant = frombank;
    }

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);

    console.log("position "+position)
    console.log("amount " + amount)
    console.log("frombank " + frombank)

    var pos = parseInt(position);
    var amt = parseInt(amount);

    if ( amt > pos && frombank == "Bank2" ) {

        console.log("賣方面額不足");

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");

            var command = '/Users/admin/Desktop/InterBankPayment_V6/alert1.sh';

            exec(command, function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        return;
    }

    var txHashA = TransactionMatcher.submitInterBankTransaction(txnseq, frombank, fromcustomer, tobank, tocustomer, amount, securities_id, payment, md5_digest, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1,
                eval('key_' + participant),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);

            } else {
                console.log(err);

                var exec = require('child_process').execFile;

                var fun1 =function(){
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function(err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                fun1();


            }

        }
    );


}


function autotest4() {

    if(TEST_MODE != "T4" || TEST_MODE_ON!="T") {
        return;
    }

    TEST_AMOUNT++;

    // var type = TEST_TYPE; // BUY or SELL doesnt matter
    var frombank = "Bank2";
    var fromcustomer = "002-000-00001";
    var tobank = "Bank2";
    var tocustomer = "002-000-00002";
    var amount = TEST_AMOUNT;
    var securities_id = "A07101";
    var payment = 0;

    var rev_txnseq = "";
    var rev_reason = "";

    var nonce = Math.floor((Math.random() * 100));
    var ts = Math.round(new Date().getTime()/1000);
    var txnseq_1 = "Bank2S"+ fromcustomer+ ts + nonce;
    var txnseq_2 = "Bank2B"+ fromcustomer+ ts + nonce;

    var _digest = frombank+fromcustomer+tobank+tocustomer+amount+securities_id+payment;

    var md5 = crypto.createHash('md5');
    var md5_digest = md5.update(_digest).digest('hex');

    console.log(md5_digest);

    //console.log("purchaseBond_N from " + frombank + " " + fromcustomer + " to " + tobank + " " + tocustomer + " amount " +amount +
    //    " securities_id " + securities_id + " payment " + payment + " txnseq " + txnseq + " rev_txnseq" + rev_txnseq + " rev_reason" + rev_reason);

    var position = TransactionMatcher.getCustomerSecuritiesPosition(securities_id, frombank, fromcustomer);
    if (amount > position) {

        console.log("賣方面額不足");

        var exec = require('child_process').execFile;

        var fun1 =function(){
            console.log("calling Application");
            exec('/Applications/NotifyCancelled.app/Contents/MacOS/applet', function(err, data) {
                console.log(err)
                console.log(data.toString());
            });
        }

        fun1();

        return;
    }


    var txHashA = TransactionMatcher.submitIntraBankTransaction(txnseq_1, frombank, fromcustomer, tocustomer, amount, securities_id, payment, md5_digest,  {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
                //eval('key_' + from_bank_name),
                //eval('key_' + to_bank_name),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);
            }else {
                var exec = require('child_process').execFile;

                var funA = function () {
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function (err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                funA();
            }
        }
    );

    setTimeout(func2, 5000);

    function func2() {
        var txHashA = TransactionMatcher.submitIntraBankTransaction(txnseq_2, frombank, fromcustomer, tocustomer, amount, securities_id, payment, md5_digest, {
            from: Bank2_admin,
            gas: 6000000,
            privateFor: [
                key_Bank1
                //eval('key_' + from_bank_name),
                //eval('key_' + to_bank_name),
                //key_Bank6
            ]
        }, function (err, txhash) {
            if (!err) {
                console.log(txhash);
            } else {
                console.log(err);

                var exec = require('child_process').execFile;

                var funA = function () {
                    console.log("calling Application");
                    exec('/Applications/NotifyFail.app/Contents/MacOS/applet', function (err, data) {
                        console.log(err)
                        console.log(data.toString());
                    });
                }

                funA();

            }
        });

    }


    console.log('交易進行中，請稍待')

}

