var isManTableShow = true;

var qry_txn_table;

var txnList = [];   // global vars for datatables
//var txnData;   // global vars for datatables
var qrytable_data_array = [];

showMan();

function showMan() {
    if(isManTableShow == false) {
        document.getElementById("txntbl").style.visibility = "visible";
        //document.getElementById("log").style.visibility = "visible";
        isManTableShow = true;
    }else {
        document.getElementById("txntbl").style.visibility = "hidden";
        //document.getElementById("log").style.visibility = "hidden";
        isManTableShow = false;
    }
}

$('#m_datetimepicker_1').datepicker({
});

$('#m_datetimepicker_2').datepicker({
});

//setInterval(queryAccBalance, 10000); //300000 MS == 5 minutes

function queryAccBalance() {

    //var acc = "002-000-00001";  // hardcode for demo

    var acc = $('#customer_id').val();
    //alert('http://127.0.0.1:3003/checkAccBal/'+ acc);

    // 使用 ajax() 來呼叫 REST API
    // transferTo/Bank4/:amount//:frombank/:tobank/:fromacc/:toacc'
    $.ajax({
        url: 'http://127.0.0.1:3003/checkAccBal/'+ $('#securities_id_a').val() + '/' + $('#query_bank1').val()  + '/' + acc,
        type: "GET",
        async: false,
        dataType: "text",
        complete: function (data) {
            var str = data.responseText;
            var fields = str.split(" ");

            var reg = new RegExp('"',"g");
            var amt = fields[0].replace(reg, "");
            var position = fields[4].replace(reg,"");


            $('#securities_amount_a').val(addComma(amt));

            var _interest = fields[1]/10000;
            $('#securities_interest_a').val(_interest+"%");
            $('#securities_start_day_a').val(tsConverter(fields[2]));
            $('#securities_end_day_a').val(tsConverter(fields[3]));
            $('#securities_position_a').val(addComma(position));
            $('#customer_name').val(fields[5]);
            $('#customer_type').val(fields[6]);

        }
    });

    queryBanner();

}

function queryBanner() {

    document.getElementById("TOTAL_PAYMENTS").innerHTML = "";
    //document.getElementById("TOTAL_TRANSACTIONS").innerHTML = "";
    document.getElementById("TOTAL_AMOUNTS").innerHTML = "";
    document.getElementById("ANNUAL_INTERESTS").innerHTML = "";
    document.getElementById("TOTAL_INTERESTS").innerHTML = "";

    //var acc = "002-000-00001";  // hardcode for demo

    //var acc = $('#customer_id').val();
    //alert('http://127.0.0.1:3001/checkAccBal/'+ acc);

    var PROCESS_MODE = "CB";
    var DLT_ACCOUNT;

    // 使用 ajax() 來呼叫 REST API
    // transferTo/Bank2/:amount//:frombank/:tobank/:fromacc/:toacc'
    $.ajax({
        url: 'http://127.0.0.1:3003/checkBanner/'+ $('#securities_id_a').val() + '/Bank4/' + $('#customer_id').val(),
        type: "GET",
        async: false,
        dataType: "text",
        complete: function (data) {
            var str = data.responseText;
            var fields = str.split(" ");

            var tmp1 = fields[0];

            if(tmp1 == "***") {
                PROCESS_MODE = "EZ";
                DLT_ACCOUNT = fields[1];
            }

            var reg = new RegExp('"',"g");
            //var block = fields[0].replace(reg, "");
            //var nonce = fields[1].replace(reg, "");

            var total_interest = fields[2].replace(reg,"");
            var total_amount = fields[3].replace(reg, "");
            //var interest_rate = parseFloat($('#securities_interest_a').val());
            var annual_interest = fields[4].replace(reg, "");;

            if(total_interest == "0") {
                annual_interest = 0;
            }

            //var html1 = '<div class="h2 font-w300 text-primary animated flipInX">'+ addComma(block) +'</div>';
            //document.getElementById("TOTAL_BLOCKS").innerHTML = html1;

            //var html2 = '<div class="h2 font-w300 text-primary animated flipInX">'+ addComma(nonce) +'</div>';
            //document.getElementById("TOTAL_TRANSACTIONS").innerHTML = html2;

            var html3  = '<div class="text-muted animated fadeIn"><small><i class="si si-calendar"></i>' + " " + $('#customer_id').val() + " [" + $('#securities_id_a').val()  +  "] " + '</small></div>';
                html3 += '<div class="h2 font-w300 text-primary animated flipInX">' + addComma(total_amount) + '</div>';
            document.getElementById("TOTAL_AMOUNTS").innerHTML = html3;

            var html4  = '<div class="text-muted animated fadeIn"><small><i class="si si-calendar"></i>' + " " + $('#customer_id').val() + " [" + $('#securities_id_a').val()  +  "] " + '</small></div>';
            html4 += '<div class="h2 font-w300 text-primary animated flipInX">' + addComma(annual_interest) + '</div>';
            document.getElementById("ANNUAL_INTERESTS").innerHTML = html4;

            var html5  = '<div class="text-muted animated fadeIn"><small><i class="si si-calendar"></i>' + " " + $('#customer_id').val() + " [" + $('#securities_id_a').val()  +  "] " + '</small></div>';
            html5 += '<div class="h2 font-w300 text-primary animated flipInX">' + addComma(total_interest) + '</div>';
            document.getElementById("TOTAL_INTERESTS").innerHTML = html5;

        }
    });


    if(PROCESS_MODE == "EZ") {

        var html1 = '<div class="font-w700 text-gray-darker animated fadeIn">客戶餘額(P2P)</div>' +
            '<div class="text-muted animated fadeIn"><small><i class="si si-calendar"></i>' + $('#customer_id').val()  + ' </small></div>';

        html1 += '<div class="h2 font-w300 text-primary animated flipInX">' + DLT_ACCOUNT +'</div>';
        document.getElementById("TOTAL_PAYMENTS").innerHTML = html1;


    }else {
        $.ajax({
            url: 'http://127.0.0.1:3000/checkCBBalance/Bank4',
            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                var str = data.responseText;
                var fields = str.split(" ");

            var reg = new RegExp('"',"g");
            var payments = fields[0].replace(reg, "");


                var html1 = '<div class="font-w700 text-gray-darker animated fadeIn">同資餘額</div>' +
                    '<div class="text-muted animated fadeIn"><small><i class="si si-calendar"></i> Bank4</small></div>';

                html1 += '<div class="h2 font-w300 text-primary animated flipInX">' + addComma(payments) + '</div>';
                document.getElementById("TOTAL_PAYMENTS").innerHTML = html1;

            }
        });
    }

}


function set_querycond() {

    var tmpStr = "";
    var cond_cnt = 0;

    var _pick_bankid = $('#m_bankid_a').val();
    // $('#data_bankid').val(_pick_bankid);

    if(_pick_bankid.length>0) {
        tmpStr += '{ "$or" : [ { "from_bank" : "'+ _pick_bankid + '" }, { "to_bank" : "' + _pick_bankid  + '" } ] },';
        cond_cnt++;
    }

    var _pick_custid = $('#m_custid_a').val();
    // $('#data_custid').val(_pick_custid);

    if(_pick_custid.length>0) {
        tmpStr += '{ "$or" : [ { "from_customer" : "'+ _pick_custid + '" }, { "to_customer" : "' + _pick_custid  + '" } ] },';
        cond_cnt++;
    }

    var _pick_secid_a = $('#m_secid_a').val();
    // $('#data_secid_a').val(_pick_secid_a);

    var _pick_secid_b = $('#m_secid_b').val();
    // $('#data_secid_b').val(_pick_secid_b);

    if(_pick_secid_a.length>0 && _pick_secid_b.length>0) {
        tmpStr += '{ "$or" : [ { "securities_id" : "'+ _pick_secid_a + '" }, { "securities_id" : "' + _pick_secid_b  + '" } ] },';
        cond_cnt++;
    }else if(_pick_secid_a.length>0 && _pick_secid_b.length==0) {
        tmpStr += '{ "securities_id" : "'+ _pick_secid_a +'" },';
        cond_cnt++;
    }else if(_pick_secid_a.length==0 && _pick_secid_b.length>0) {
        tmpStr += '{ "securities_id" : "'+ _pick_secid_b +'" },';
        cond_cnt++;
    }

    var _pick_amount_a = $('#m_amount_a').val();
    // $('#data_amount_a').val(_pick_amount_a);

    var _pick_amount_b = $('#m_amount_b').val();
    // $('#data_amount_b').val(_pick_amount_b);

    if(_pick_amount_a.length>0 && _pick_amount_b.length>0) {
        tmpStr += '{ "$and" : [ { "amount" : { "$gt" : '+ removeComma(_pick_amount_a) + '} }, { "amount" : { "$lt" :  ' + removeComma(_pick_amount_b)  + ' } } ] },';
        cond_cnt++;
    }else if(_pick_amount_a.length>0 && _pick_amount_b.length==0) {
        tmpStr += '{ "amount" : { "$gt" : '+ removeComma(_pick_amount_a)  + '} },';
        cond_cnt++;
    }else if(_pick_amount_a.length==0 && _pick_amount_b.length>0) {
        tmpStr += '{ "amount" : { "$lt" : '+ removeComma(_pick_amount_b) + '} },';
        cond_cnt++;
    }else if(_pick_amount_a > _pick_amount_b) {
        alert("查詢條件（面額）設定錯誤，忽略此條件。");
    }

    var _pick_payment_a = $('#m_payment_a').val();
    // $('#data_payment_a').val(_pick_payment_a);

    var _pick_payment_b = $('#m_payment_b').val();
    // $('#data_payment_b').val(_pick_payment_b);

    if(_pick_payment_a.length>0 && _pick_payment_b.length>0) {
        tmpStr += '{ "$and" : [ { "payment" : { "$gt" : '+ removeComma(_pick_payment_a) + '} }, { "payment" : { "$lt" :  ' + removeComma(_pick_payment_b)  + ' } } ] },';
        cond_cnt++;
    }else if(_pick_payment_a.length>0 && _pick_payment_b.length==0) {
        tmpStr += '{ "payment" : { "$gt" : '+ removeComma(_pick_payment_a) + '} },';
        cond_cnt++;
    }else if(_pick_payment_a.length==0 && _pick_payment_b.length>0) {
        tmpStr += '{ "payment" : { "$lt" : '+ removeComma(_pick_payment_b) + '} },';
        cond_cnt++;
    }else if(_pick_payment_a > _pick_payment_b) {
        alert("查詢條件（金額）設定錯誤，忽略此條件。");
    }

    var _pick_datetime1 = $('#m_datetimepicker_1').val();
    // $('#data_datetimepicker1').val(_pick_datetime1);

    var _pick_datetime2 = $('#m_datetimepicker_2').val();
    // $('#data_datetimepicker2').val(_pick_datetime2);

    if(_pick_datetime1.length>0 && _pick_datetime2.length>0) {

        var str_ts = (new Date(_pick_datetime1).getTime()) * 1000000;
        var end_ts = (new Date(_pick_datetime2).getTime()) * 1000000;

        tmpStr += '{ "$and" : [ { "timestamp" : { "$gt" : '+ str_ts + '} }, { "timestamp" : { "$lt" :  ' + end_ts  + ' } } ] },';
        cond_cnt++;

    }else if(_pick_datetime1.length>0 && _pick_datetime2.length==0) {

        var str_ts = (new Date(_pick_datetime1).getTime()) * 1000000;

        tmpStr += '{ "timestamp" : { "$gt" : '+ str_ts + '} },';
        cond_cnt++;

    }else if(_pick_datetime1.length==0 && _pick_datetime2.length>0) {

        var end_ts = (new Date(_pick_datetime2).getTime()) * 1000000;

        tmpStr += '{ "timestamp" : { "$lt" : '+ end_ts + '} },';
        cond_cnt++;

    }else if(_pick_datetime1 > _pick_datetime2) {
        alert("查詢條件（時間）設定錯誤，忽略此條件。");
    }

    var _pick_txnstat_a = $('#m_txnstat_a').val();
    // $('#data_txnstat_a').val(_pick_txnstat_a);

    var _pick_txnstat_b = $('#m_txnstat_b').val();
    // $('#data_txnstat_b').val(_pick_txnstat_b);

    if(_pick_txnstat_a.length>0 && _pick_txnstat_b.length>0) {
        tmpStr += '{ "$or" : [ { "txnstate" : "'+ _pick_txnstat_a + '" }, { "txnstate" : "' + _pick_txnstat_b  + '" } ] },';
        cond_cnt++;
    }else if(_pick_txnstat_a.length>0 && _pick_txnstat_b.length==0) {
        tmpStr += '{ "txnstate" : "'+ _pick_txnstat_a + '" },';
        cond_cnt++;
    }else if(_pick_txnstat_a.length==0 && _pick_txnstat_b.length>0) {
        tmpStr += '{ "txnstate" : "'+ _pick_txnstat_b + '" },';
        cond_cnt++;
    }

    var _pick_query;

    if(cond_cnt==0) {
        _pick_query = "";
    }else if(cond_cnt==1) {
        _pick_query = tmpStr.substring(0, (tmpStr.length-1));
    }else {
        _pick_query = '{ "$and" : [' + tmpStr.substring(0, (tmpStr.length-1)) + '] }';
    }

    //alert(_pick_query);

    $('#data_qry_txn_string').val(_pick_query);

    qryTxnTable2();

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


function removeComma(str) {
    str = str.replace(/,/g, "");
    return str;
}

function addCommaHilite(number) {
    var num = "" + number;
    if(num.charAt(0) == '*') {
        num = num.substring(1);
        return '<span style="color:red">' + addComma(num) + '</span>';
    }else {
        return addComma(num);
    }
}

function formatNum(fieldName) {
    var x = removeComma(document.getElementById(fieldName).value);
    document.getElementById(fieldName).value = addComma(x);
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
    return date + '/' + month + '/' + year;
}

function hideTxnTable() {
    document.getElementById("TxnTableHolder").innerHTML = "";
}

function showTxnTable1() {

    var cust_id = $('#customer_id').val();

    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">交易對手</td>' +
        '        <td style=\"text-align: center\">更正交易</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left\" size=\"50\">　<b>跨行轉出公債</b>　</td>' +
        '        <td style=\"text-align: left; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【轉出方銀行】</label><input id=\"from_bank_1\" type=\"text\" value=\"Bank4\" readonly/>' +
        '            <label class=\"label_2\">【轉出方帳號】</label><input id=\"from_customer_1\" type=\"text\" value=\"'+ cust_id + '\" /><br/>' +
        '            <br/><br/><label class=\"label_2\">【公債代號】</label><input id=\"securities_id_1\" class="datarow" type=\"text\" size=\"10\"/>' +
        '            <br/><label class=\"label_2\">【交易面額】</label><input id=\"amount_1\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'amount_1\')\"/>' +
        '            <br/><label class=\"label_2\">【交易金額】</label><input id=\"payment_1\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'payment_1\')\"/>' +
        '            <input id=\"data_t1\" type=\"text\" readonly hidden size=\"20\"/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding : 10px\" size=\"100\">' +
        '            <label class=\"label_2\">【轉入方銀行】</label><input NAME=\"to_bank_1\" class="datarow" id=\"to_bank_1\" value=\"\" size=\"10\"><br/>' +
        '            <label class=\"label_2\">【轉入方帳號】</label><input NAME=\"to_customer_1\" class="datarow" id=\"to_customer_1\" value=\"\" size=\"20\">' +
        '            </input>' +
        '        </td>' +
        '        <td style=\"text-align: left; padding : 10px\" size=\"100\">' +
        '            <label class=\"label_2\">【原交易序號】</label><br/><input NAME=\"rev_txnseq_1\" class="datarow" id=\"rev_txnseq_1\" value=\"\" size=\"30\" /><br/><br/>' +
        '            <label class=\"label_2\">【更正理由】</label><br/><select NAME=\"rev_reason_1\" class="datarow" id=\"rev_reason_1\"/>' +
        '            <option value="E0"></option>'  +
        '            <option value="E1">面額輸入錯誤</option>'  +
        '            <option value="E2">金額輸入錯誤</option>'  +
        '            <option value="E3">公債代號輸入錯誤</option>'  +
        '            <option value="E4">轉出方銀行輸入錯誤</option>'  +
        '            <option value="E5">轉出方帳號輸入錯誤</option>'  +
        '            <option value="E6">轉入方銀行輸入錯誤</option>'  +
        '            <option value="E7">轉入方帳號輸入錯誤</option>'  +
        '            </select>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"btn_rounded\" id=\"purchaseBond1\" onclick=\"purchaseBond1()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}

function showTxnTable2() {

    var cust_id = $('#customer_id').val();

    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">交易對手</td>' +
        '        <td style=\"text-align: center\">更正交易</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left\" size=\"50\">　<b>跨行轉入公債</b>　</td>' +
        '        <td style=\"text-align: left; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【轉入方銀行】</label><input id=\"to_bank_2\" type=\"text\" value="Bank4" readonly/>' +
        '            <label class=\"label_2\">【轉入方帳號】</label><input id=\"to_customer_2\" type=\"text\"  value=\"'+ cust_id + '\"/><br/>' +
        '            <br/><br/><label class=\"label_2\">【公債代號】</label><input class="datarow" id=\"securities_id_2\" type=\"text\" size=\"10\" />' +
        '            <br/><label class=\"label_2\">【交易面額】</label><input id=\"amount_2\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'amount_2\')\"/>' +
        '            <br/><label class=\"label_2\">【交易金額】</label><input id=\"payment_2\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'payment_2\')\"/>' +
        '            <input id=\"data_t2\" type=\"text\" readonly hidden size=\"30\"/>' +
        '        </td>' +
        '        <td class="dataroweven" style="text-align: left; padding : 10px" size="100">' +
        '            <label class=\"label_2\">【轉出方銀行】</label><input class="datarow" NAME=\"from_bank_2\" id=\"from_bank_2\" value=\"\" size=\"10\"><br/>' +
        '            <label class=\"label_2\">【轉出方帳號】</label><input class="datarow" NAME=\"from_customer_2\" id=\"from_customer_2\" value=\"\" size=\"20\">' +
        '            </input>' +
        '        </td>' +
        '        <td style="text-align: left; padding : 10px" size="100">' +
        '            <label class=\"label_2\">【原交易序號】</label><br/><input NAME=\"rev_txnseq_2\" class="datarow" id=\"rev_txnseq_2\" value=\"\" size=\"30\"/><br/>' +
        '            <label class=\"label_2\">【更正理由】</label><br/><select NAME=\"rev_reason_2\" class="datarow" id=\"rev_reason_2\" value=\"\"/>' +
        '            <option value="E0"></option>'  +
        '            <option value="E1">面額輸入錯誤</option>'  +
        '            <option value="E2">金額輸入錯誤</option>'  +
        '            <option value="E3">公債代號輸入錯誤</option>'  +
        '            <option value="E4">轉出方銀行輸入錯誤</option>'  +
        '            <option value="E5">轉出方帳號輸入錯誤</option>'  +
        '            <option value="E6">轉入方銀行輸入錯誤</option>'  +
        '            <option value="E7">轉入方帳號輸入錯誤</option>'  +
        '            </select>' +
        '            ' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"purchaseBond2\" onclick=\"purchaseBond2()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}


function showTxnTable3() {

    var cust_id = $('#customer_id').val();


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">交易對手</td>' +
        '        <td style=\"text-align: center\">更正交易</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>自行轉出公債</b></td>' +
        '        <td style=\"text-align: left; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【轉出方銀行】</label><input id=\"from_bank_3\" type=\"text\" value=\"Bank4\" readonly/>' +
        '            <label class=\"label_2\">【轉出方帳號】</label><input id=\"from_customer_3\" type=\"text\" value=\"'+ cust_id + '\" /><br/>' +
        '            <br/><br/><label class=\"label_2\">【公債代號】</label><input class=\"datarow\" id=\"securities_id_3\" type=\"text\" size=\"10\"/>' +
        '            <br/><label class=\"label_2\">【交易面額】</label><input id=\"amount_3\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'amount_3\')\"/>' +
        '            <br/><label class=\"label_2\">【交易金額】</label><input id=\"payment_3\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'payment_3\')\"/>' +
        '            <input id=\"data_t3\" type=\"text\" readonly size=\"30\" hidden/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style="text-align: left; padding : 10px" size="100">' +
        '            <label class=\"label_2\">【轉入方銀行】</label><input NAME=\"to_bank_3\" id=\"to_bank_3\" value=\"Bank4\" readonly/><br/>' +
        '            <label class=\"label_2\">【轉入方帳號】</label><input NAME=\"to_customer_3\" class=\"datarow\" id=\"to_customer_3\" value=\"\" size=\"20\">' +
        '            </input>' +
        '        </td>' +
        '        <td style="text-align: left; padding : 10px" size="100">' +
        '            <label class=\"label_2\">【原交易序號】</label><br/><input NAME=\"rev_txnseq_3\" class="datarow" id=\"rev_txnseq_3\" value=\"\" size=\"30\"/><br/>' +
        '            <label class=\"label_2\">【更正理由】</label><br/><select NAME=\"rev_reason_3\" class="datarow" id=\"rev_reason_3\" value=\"\"/>' +
        '            <option value="E0"></option>'  +
        '            <option value="E1">面額輸入錯誤</option>'  +
        '            <option value="E2">金額輸入錯誤</option>'  +
        '            <option value="E3">公債代號輸入錯誤</option>'  +
        '            <option value="E4">轉出方銀行輸入錯誤</option>'  +
        '            <option value="E5">轉出方帳號輸入錯誤</option>'  +
        '            <option value="E6">轉入方銀行輸入錯誤</option>'  +
        '            <option value="E7">轉入方帳號輸入錯誤</option>'  +
        '            </select>' +
        '            ' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_3\" id=\"purchaseBond3\" onclick=\"purchaseBond3()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}

function showTxnTable4() {

    var cust_id = $('#customer_id').val();


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">交易對手</td>' +
        '        <td style=\"text-align: center\">更正交易</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>自行轉入公債</b></td>' +
        '        <td style=\"text-align: left; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【轉入方銀行】</label><input id=\"to_bank_4\" type=\"text\" value=\"Bank4\" readonly/>' +
        '            <label class=\"label_2\">【轉入方帳號】</label><input id=\"to_customer_4\" type=\"text\" value=\"'+ cust_id + '\" /><br/>' +
        '            <br/><br/><label class=\"label_2\">【公債代號】</label><input class=\"datarow\" id=\"securities_id_4\" type=\"text\" size=\"10\"/>' +
        '            <br/><label class=\"label_2\">【交易面額】</label><input id=\"amount_4\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'amount_4\')\"/>' +
        '            <br/><label class=\"label_2\">【交易金額】</label><input id=\"payment_4\" class="datarow" type=\"text\" size=\"10\" onblur=\"formatNum(\'payment_4\')\"/>' +
        '            <input id=\"data_t4\" type=\"text\" readonly size=\"30\" hidden/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style="text-align: left; padding: 10px" size="100">' +
        '            <label class=\"label_2\">【轉出方銀行】</label><input NAME=\"from_bank_4\" id=\"from_bank_4\" value=\"Bank4\" readonly /><br/>' +
        '            <label class=\"label_2\">【轉出方帳號】</label><input class=\"datarow\" id=\"from_customer_4\" value=\"\" size=\"20\">' +
        '            </input>' +
        '        </td>' +
        '        <td style="text-align: left; padding: 10px" size="100">' +
        '            <label class=\"label_2\">【原交易序號】</label><br/><input NAME=\"rev_txnseq_4\" class="datarow" id=\"rev_txnseq_4\" value=\"\" size=\"30\"/><br/>' +
        '            <label class=\"label_2\">【更正理由】</label><br/><select NAME=\"rev_reason_4\" class="datarow" id=\"rev_reason_4\" value=\"\"/>' +
        '            <option value="E0"></option>'  +
        '            <option value="E1">面額輸入錯誤</option>'  +
        '            <option value="E2">金額輸入錯誤</option>'  +
        '            <option value="E3">公債代號輸入錯誤</option>'  +
        '            <option value="E4">轉出方銀行輸入錯誤</option>'  +
        '            <option value="E5">轉出方帳號輸入錯誤</option>'  +
        '            <option value="E6">轉入方銀行輸入錯誤</option>'  +
        '            <option value="E7">轉入方帳號輸入錯誤</option>'  +
        '            </select>' +
        '            ' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"purchaseBond4\" onclick=\"purchaseBond4()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}

function showTxnTable5() {

    var cust_id = $('#customer_id').val();


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>設定帳戶資料<b></td>' +
        '        <td style=\"text-align: left; padding: 10px; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【銀行代號】</label><input id=\"to_bank_5\" type=\"text\" value=\"Bank4\" readonly/>' +
        '            <label class=\"label_2\">【客戶帳號】</label><input id=\"to_customer_5\" type=\"text\" value=\"'+ cust_id + '\" /><br/>' +
        '            <br/><br/><label class=\"label_2\">【客戶名稱】</label><input class=\"datarow\" id=\"to_name_5\" type=\"text\" size="54" value=\"\"/>' +
        '            <br/><label class=\"label_2\">【存戶類別編號】</label><input class=\"datarow\" id=\"to_type_5\" type=\"text\" size=\"50\" value=\"\"/>' +
        '            <input id=\"data_t5\" type=\"text\" readonly size=\"30\" hidden/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"\" onclick=\"setCustomerInfo()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}


function showTxnTable6() {

    var cust_id = $('#customer_id').val();


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>存入同資款項<b></td>' +
        '        <td style=\"text-align: left; padding: 10px; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【銀行代號】</label><input id=\"to_bank_6\" type=\"text\" value=\"Bank4\" readonly/>' +
        '            <label class=\"label_2\">【同資款項】</label><input id=\"cb_balance_6\" type=\"text\" value=\"\" onblur="formatNum(\'cb_balance_6\')"/><br/>' +
        '            <input id=\"data_t6\" type=\"text\" readonly size=\"30\" hidden/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"\" onclick=\"depositCBBalance()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}


function showTxnTable7() {

    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>切換處理模式<b></td>' +
        '        <td style=\"text-align: left; padding: 10px; padding: 10px\" size=\"600\">' +
        '        <label class="label_2">【處理模式】</label>' +
        '        <select id="process_mode" class="form-control"><option></option>' +
        '                <option value="CB">同資結算</option>' +
        '                <option value="EZ">跨鏈結算</option>' +
        '        </select>' +
        '        <!--label class=\"label_2\">【跨鏈逾時】</label><input id=\"process_timeout\" type=\"text\" value=\"30\"/-->' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"\" onclick=\"switchMode()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}


function showTxnTable8() {

    var cust_id = $('#customer_id').val();


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>客戶存入帳款<b></td>' +
        '        <td style=\"text-align: left; padding: 10px; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【客戶帳號】</label><input id=\"dlt_acc_7\" type=\"text\" value=\"\" />' +
        '            <label class=\"label_2\">【交易準備金】</label><input id=\"dlt_balance_7\" type=\"text\" value=\"\" onblur="formatNum(\'dlt_balance_7\')"/><br/>' +
        '            <input id=\"data_t8\" type=\"text\" readonly size=\"30\" hidden/>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"\" onclick=\"depositDLTBalance()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}


function showTxnTable9() {


    var htmlstr = '<table class=\"fancytable_2\">' +
        '    <tbody>' +
        '    <tr class=\"headerrow_2\">' +
        '        <td style=\"text-align: center\">交易名稱</td>' +
        '        <td style=\"text-align: center\">輸入欄位</td>' +
        '        <td style=\"text-align: center\">設定/查詢</td>' +
        '    </tr>' +
        '    <tr>' +
        '        <td class=\"dataroweven\" style=\"text-align: left; padding: 10px\" size=\"12\"><b>自動測試模式<b></td>' +
        '        <td style=\"text-align: left; padding: 10px; padding: 10px\" size=\"600\">' +
        '            <label class=\"label_2\">【對手銀行】</label><input id=\"to_bank_9\" type=\"text\" value=\"Bank2\"/>' +
        '            <label class=\"label_2\">【測試間隔】</label><input id=\"test_period_9\" type=\"text\" value=\"20000\"/><br/>' +
        '        <label class="label_2">【測試型態】</label>' +
        '        <select id="test_type_9" class="form-control"><option></option>' +
        '                <option value="B" selected="selected">買方</option>' +
        '                <option value="S">賣方</option>' +
        '        </select>' +
        '        <label class="label_2">【測試模式】</label>' +
        '        <select id="test_mode_9" class="form-control"><option></option>' +
        '                <option value="T1" selected="selected">跨行DVP</option>' +
        '                <option value="T2">自行DVP</option>' +
        '                <option value="T3">跨行FOP</option>' +
        '                <option value="T4">自行FOP</option>' +
        '        </select>' +
        '        <label class="label_2">【測試開關】</label>' +
        '        <select id="test_flag_9" class="form-control"><option></option>' +
        '                <option value="T">開啟</option>' +
        '                <option value="F">關閉</option>' +
        '        </select>' +
        '        </td>' +
        '        <td class=\"dataroweven\" style=\"padding: 10px\">' +
        '            <button class=\"button_2\" id=\"\" onclick=\"testMode()\">執行交易</button>' +
        '        </td>' +
        '    </tr>';

    document.getElementById("TxnTableHolder").innerHTML = htmlstr;

}



function qryInputErr() {

    //alert(htmlstr);
    //alert(qrytable_data_array[0]["txnseq"]);
    //alert(JSON.stringify(qry_txn_table));

    document.getElementById("BLOCK_TIMELINE").innerHTML = "";

    var qry_pnd_data_array = [];
    var qry_err_data_array = [];

    for (var i=0,j=0; i<qrytable_data_array.length; i++) {
        if(qrytable_data_array[i]["txnstate"] == "Pending") {
            qry_pnd_data_array[j] = qrytable_data_array[i];
            j++;
        }
    }

    //alert(JSON.stringify(qry_pnd_data_array));


    for (var x=0; x<qry_pnd_data_array.length; x++) {

        var tmp_array = qry_pnd_data_array[x];
        //alert(JSON.stringify(tmp_array));

        for (var y = 0; y < qry_pnd_data_array.length; y++) {

            if( tmp_array["_id"] != qry_pnd_data_array[y]["_id"] &&
                tmp_array["from_bank"] == qry_pnd_data_array[y]["from_bank"] &&
                tmp_array["from_customer"] == qry_pnd_data_array[y]["from_customer"] &&
                tmp_array["to_bank"] == qry_pnd_data_array[y]["to_bank"] &&
                tmp_array["to_customer"] == qry_pnd_data_array[y]["to_customer"] &&
                tmp_array["securities_id"] == qry_pnd_data_array[y]["securities_id"] )
            {

                if(tmp_array["amount"] == qry_pnd_data_array[y]["amount"] &&
                    tmp_array["payment"] == qry_pnd_data_array[y]["payment"]) {
                    continue;
                }

                if(tmp_array["causer"] != "InputErr") {

                    if( (tmp_array["amount"] != qry_pnd_data_array[y]["amount"]) &&
                        (tmp_array["payment"] != qry_pnd_data_array[y]["payment"]) ) {
                        continue;
                    }

                    if(tmp_array["amount"] != qry_pnd_data_array[y]["amount"]){
                        var _amt = tmp_array["amount"];
                        tmp_array["amount"] = '*'+_amt;
                    }
                    else if(tmp_array["payment"] != qry_pnd_data_array[y]["payment"]){
                        var _pmt = tmp_array["payment"];
                        tmp_array["payment"] = '*'+_pmt;
                    }

                    qry_err_data_array.push(tmp_array);
                    //qry_err_data_array.push(qry_pnd_data_array[y]);
                    //qry_pnd_data_array[y]["txnstate"] = "InputErr";
                    tmp_array["causer"] = "InputErr";
                }
            }
        }
    }

    //alert(qry_err_data_array.length + " " +JSON.stringify(qry_err_data_array))

    // qrytable_data_array = $.parseJSON(arrayStr);

    document.getElementById("txntbl").style.visibility = "visible";

    var htmlstr ='<table id="example" class="display" style="box-shadow: 0 1px 3px rgba(0,0,0,0.2)" cellspacing="0" width="100%">' +
        "    <thead>                                      "  +
        '    <tr class="data_table_header">                                      '  +
        "    <th></th>                               "  +
        '    <th style="text-align:center">交易<br/>序號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>形態<br/></th>                                      '  +
        '    <th style="text-align:center">轉出方<br/>銀行<br/></th>                                      '  +
        '    <th style="text-align:center">轉出方<br/>帳號<br/></th>                                      '  +
        '    <th style="text-align:center">轉入方<br/>銀行<br/></th>                                      '  +
        '    <th style="text-align:center">轉入方<br/>帳號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>面額<br/></th>                                      '  +
        '    <th style="text-align:center">公債<br/>代號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>金額<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>日期<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>狀態<br/></th>                                      '  +
        '    <th style="text-align:center">原交易<br/>序號<br/></th>                                      '  +
        '    <th style="text-align:center">異常<br/>原因<br/></th>                                      '  +
        '    </tr>                                      '  +
        '    </thead>                                   ';

    document.getElementById("TxnTableHolder2").innerHTML = htmlstr;

    qry_txn_table = $('#example').DataTable( {
        ordering: true,
        data: qry_err_data_array,
        columnDefs: [ {
            orderable: false,
            className: 'select-checkbox',
            targets:   0
        } ],
        select: {
            style:    'os',
            selector: 'td:first-child'
        },
        order: [[ 10, 'desc' ]],
        columns: [
            { data: 'filler'},
            { data: 'txnseq', width: 10
            },
            { data: 'txntype', width: 50
            },
            { data: 'from_bank', width: 50
            },
            { data: 'from_customer', width: 50
            },
            { data: 'to_bank', width: 50
            },
            { data: 'to_customer', width: 50
            },
            { data: 'amount', width: 80,
                "render": function ( data, type, row, meta ) {
                    return addCommaHilite(data);
                }
            },
            { data: 'securities_id', width: 50, },
            { data: 'payment' , width: 80,
                "render": function ( data, type, row, meta ) {
                    return addCommaHilite(data);
                }
            },
            { data: 'timestamp', width: 50,
                "render": function ( data, type, row, meta ) {
                    return soliditytsConverter(row.timestamp+" ");
                }
            },
            { data: 'txnstate' , width: 60,

                "render": function ( data, type, row, meta ) {
                    if(data == "Pending") {
                        return '<span class="label label-warning">' + data + '</span>';
                    }
                }
            },
            { data: 'rev_txnseq', width: 50, },
            { data: 'causer' , width: 50,
                "render": function ( data, type, row, meta ) {
                    return '<span style="color:red">疑似輸<br/>入錯誤</span>';
                }
            },
            {data: "txhash1",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber1",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash2",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber2",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash3",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber3",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash4",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber4",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash5",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber5",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            }
        ],
        language: {
            "sProcessing": "處理中...",
            "sLengthMenu": "顯示 _MENU_ 項結果",
            "sZeroRecords": "沒有查詢結果",
            "sInfo": "顯示第 _START_ 至 _END_ 項結果，共 _TOTAL_ 項",
            "sInfoEmpty": "顯示第 0 至 0 項結果，共 0 項",
            "sInfoFiltered": "(由 _MAX_ 項結果過濾)",
            "sInfoPostFix": "",
            "sSearch": "搜索:",
            "sUrl": "",
            "sEmptyTable": "表中資料為空",
            "sLoadingRecords": "載入中...",
            "sInfoThousands": ",",
            "oPaginate": {
                "sFirst": "首頁",
                "sPrevious": "上頁",
                "sNext": "下頁",
                "sLast": "末頁"
            },
            "oAria": {
                "sSortAscending": ": 以升冪排列此列",
                "sSortDescending": ": 以降冪排列此列"
            }

        }

    } );

    qry_txn_table.on( 'click', 'tr', function () {
        $(this).toggleClass('selected');
    } );

}



function qryTxnTable2() {

    document.getElementById("BLOCK_TIMELINE").innerHTML="";

    qrytable_data_array = [];

    //var qry_string = $('#data_qry_txn_string').val();

    //var qry_string = "";
    var qry_string = $('#data_qry_txn_string').val();

    //alert(qry_string);

    if(qry_string.length == 0) {
        qry_string = "NA";
    }

    var arrayStr = $.ajax({
        type: "GET",
        url: 'http://127.0.0.1:3003/checkTxnInfo/'+qry_string,
        async: false
    }).responseText;

    qrytable_data_array = $.parseJSON(arrayStr);


    document.getElementById("txntbl").style.visibility = "visible";

    var htmlstr ='<table id="example" class="display" style="box-shadow: 0 1px 3px rgba(0,0,0,0.2)" cellspacing="0" width="100%">' +
        "    <thead>                                      "  +
        '    <tr class="data_table_header">                                      '  +
        "    <th></th>                               "  +
        '    <th style="text-align:center">交易<br/>序號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>形態<br/></th>                                      '  +
        '    <th style="text-align:center">轉出方<br/>銀行<br/></th>                                      '  +
        '    <th style="text-align:center">轉出方<br/>帳號<br/></th>                                      '  +
        '    <th style="text-align:center">轉入方<br/>銀行<br/></th>                                      '  +
        '    <th style="text-align:center">轉入方<br/>帳號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>面額<br/></th>                                      '  +
        '    <th style="text-align:center">公債<br/>代號<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>金額<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>日期<br/></th>                                      '  +
        '    <th style="text-align:center">交易<br/>狀態<br/></th>                                      '  +
        '    <th style="text-align:center">原交易<br/>序號<br/></th>                                      '  +
        '    <th style="text-align:center">異常<br/>原因<br/></th>                                      '  +
        '    </tr>                                      '  +
        '    </thead>                                   ';

    document.getElementById("TxnTableHolder2").innerHTML = htmlstr;

    qry_txn_table = $('#example').DataTable( {
        ordering: true,
        data: qrytable_data_array,
        columnDefs: [ {
            orderable: false,
            className: 'select-checkbox',
            targets:   0
        } ],
        select: {
            style:    'os',
            selector: 'td:first-child'
        },
        order: [[ 10, 'desc' ]],
        columns: [
            { data: 'filler'},
            { data: 'txnseq', width: 10
            },
            { data: 'txntype', width: 50
            },
            { data: 'from_bank', width: 50
            },
            { data: 'from_customer', width: 50
            },
            { data: 'to_bank', width: 50
            },
            { data: 'to_customer', width: 50
            },
            { data: 'amount', width: 80,
                "render": function ( data, type, row, meta ) {
                    return addComma(data);
                }
            },
            { data: 'securities_id', width: 50, },
            { data: 'payment' , width: 80,
                "render": function ( data, type, row, meta ) {
                    return addComma(data);
                }
            },
            { data: 'timestamp', width: 50,
                "render": function ( data, type, row, meta ) {
                    return soliditytsConverter(row.timestamp+" ");
                }
            },
            { data: 'txnstate' , width: 60,

                "render": function ( data, type, row, meta ) {
                    if(data == "Pending") {
                        return '<span class="label label-warning">' + data + '</span>';
                    }else if(data == "Cancelled") {
                        return '<span class="label label-danger">' + data + '</span>';
                    }else if(data == "Waiting4Payment") {
                        return '<span class="label label-info">' + data + '</span>';
                    }else if(data == "PaymentError") {
                        return '<span class="label label-danger">' + data + '</span>';
                    }else if(data == "Finished") {
                        return '<span class="label label-success">' + data + '</span>';
                    }
                }
            },
            { data: 'rev_txnseq', width: 50, },
            { data: 'causer' , width: 50,
                "render": function ( data, type, row, meta ) {
                    if(data == "E1") {
                        return '面額輸入錯誤';
                    }else if(data == "E2") {
                        return '金額輸入錯誤';
                    }else if(data == "E3") {
                        return '公債代號輸入錯誤';
                    }else if(data == "E4") {
                        return '轉出方銀行輸入錯誤';
                    }else if(data == "E5") {
                        return '轉出方帳號輸入錯誤';
                    }else if(data == "E6") {
                        return '轉入方銀行輸入錯誤';
                    }else if(data == "E7") {
                        return '轉入方帳號輸入錯誤';
                    }else {
                        return data;
                    }
                }
            },
            {data: "txhash1",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber1",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash2",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber2",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash3",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber3",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash4",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber4",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "txhash5",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            },
            {data: "blocknumber5",
                width: 1,
                "visible": false,
                "render": function (data, type, row, meta ) {
                    return '<span style="visibility: hidden;">'+ data + '</span>';
                }
            }
        ],
        language: {
            "sProcessing": "處理中...",
            "sLengthMenu": "顯示 _MENU_ 項結果",
            "sZeroRecords": "沒有查詢結果",
            "sInfo": "顯示第 _START_ 至 _END_ 項結果，共 _TOTAL_ 項",
            "sInfoEmpty": "顯示第 0 至 0 項結果，共 0 項",
            "sInfoFiltered": "(由 _MAX_ 項結果過濾)",
            "sInfoPostFix": "",
            "sSearch": "搜索:",
            "sUrl": "",
            "sEmptyTable": "表中資料為空",
            "sLoadingRecords": "載入中...",
            "sInfoThousands": ",",
            "oPaginate": {
                "sFirst": "首頁",
                "sPrevious": "上頁",
                "sNext": "下頁",
                "sLast": "末頁"
            },
            "oAria": {
                "sSortAscending": ": 以升冪排列此列",
                "sSortDescending": ": 以降冪排列此列"
            }

        }

    } );

    qry_txn_table.on( 'click', 'tr', function () {
        $(this).toggleClass('selected');
    } );

}

function purchaseBond1() {

    //alert("purchaseBond")

    $('#data_t1').val("");

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        var from_bank =  $('#from_bank_1').val();
        var from_customer = $('#from_customer_1').val();
        var to_bank = $('#to_bank_1').val();
        var to_customer = $('#to_customer_1').val();
        var amount = removeComma($('#amount_1').val());
        var securities_id = $('#securities_id_1').val();
        var payment = removeComma($('#payment_1').val());
        var rev_txnseq = $('#rev_txnseq_1').val();
        var rev_reason = $('#rev_reason_1').val();

        if(rev_txnseq < 20) {
            rev_txnseq = 'N';
        }

        if(from_customer.length != 13 || to_customer.length != 13) {
            alert("帳號長度輸入錯誤");
            return;
        }


        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/purchaseBond/Bank4/S/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/' + rev_txnseq + '/' + rev_reason);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/purchaseBond/Bank4/S/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/' + rev_txnseq  + '/' + rev_reason,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //alert(JSON.stringify(data));
                //alert("Ajax call success : txnseq="+data.responseText);
                var tmpstr1 = data.responseText
                var len1 = tmpstr1.length;
                var tmpstr2 = tmpstr1.slice(0,len1);
                $('#data_t1').val(tmpstr2);
                txnList.push(tmpstr2);
                //console.log(data);
                hideTxnTable();
                showTxnTable1();
            }
        });
    };

    submitAjax();

}



function purchaseBond2() {

    //alert("purchaseBond")

    $('#data_t2').val("");

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        var from_bank =  $('#from_bank_2').val();
        var from_customer = $('#from_customer_2').val();
        var to_bank = $('#to_bank_2').val();
        var to_customer = $('#to_customer_2').val();
        var amount = removeComma($('#amount_2').val());
        var securities_id = $('#securities_id_2').val();
        var payment = removeComma($('#payment_2').val());
        var rev_txnseq = $('#rev_txnseq_2').val();
        var rev_reason = $('#rev_reason_2').val();

        if(rev_txnseq < 20) {
            rev_txnseq = 'N';
        }

        if(from_customer.length != 13 || to_customer.length != 13) {
            alert("帳號長度輸入錯誤");
            return;
        }

        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/purchaseBond/Bank4/B/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/'+ rev_txnseq  + '/' + rev_reason);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/purchaseBond/Bank4/B/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/' + rev_txnseq  + '/' + rev_reason,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                var tmpstr1 = data.responseText
                var len1 = tmpstr1.length;
                var tmpstr2 = tmpstr1.slice(0,len1);
                $('#data_t2').val(tmpstr2);
                txnList.push(tmpstr2);
                hideTxnTable();
                hideTxnTable();
                showTxnTable2();

            }
        });
    };

    submitAjax();

}


function purchaseBond3() {

    //alert("purchaseBond")

    $('#data_t3').val("");

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        var from_bank =  $('#from_bank_3').val();
        var from_customer = $('#from_customer_3').val();
        var to_bank = $('#to_bank_3').val();
        var to_customer = $('#to_customer_3').val();
        var amount = removeComma($('#amount_3').val());
        var securities_id = $('#securities_id_3').val();
        var payment = removeComma($('#payment_3').val());
        var rev_txnseq = $('#rev_txnseq_3').val();
        var rev_reason = $('#rev_reason_3').val();

        if(rev_txnseq < 20) {
            rev_txnseq = 'N';
        }

        if(from_customer.length != 13 || to_customer.length != 13) {
            alert("帳號長度輸入錯誤");
            return;
        }


        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/purchaseBond_N/Bank4/S/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/'+ rev_txnseq  + '/' + rev_reason);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/purchaseBond_N/Bank4/S/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/'+ rev_txnseq  + '/' + rev_reason,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //alert(JSON.stringify(data));
                //alert("Ajax call success : txnseq="+data.responseText);
                var tmpstr1 = data.responseText
                var len1 = tmpstr1.length
                var tmpstr2 = tmpstr1.slice(0,len1);
                $('#data_t3').val(tmpstr2);
                txnList.push(tmpstr2);
                hideTxnTable();
                showTxnTable3();
            }
        });
    };

    submitAjax();

}


function purchaseBond4() {

    //alert("purchaseBond")

    $('#data_t4').val("");

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        var from_bank =  $('#from_bank_4').val();
        var from_customer = $('#from_customer_4').val();
        var to_bank = $('#to_bank_4').val();
        var to_customer = $('#to_customer_4').val();
        var amount = removeComma($('#amount_4').val());
        var securities_id = $('#securities_id_4').val();
        var payment = removeComma($('#payment_4').val());
        var rev_txnseq = $('#rev_txnseq_4').val();
        var rev_reason = $('#rev_reason_4').val();

        if(rev_txnseq < 20) {
            rev_txnseq = 'N';
        }

        if(from_customer.length != 13 || to_customer.length != 13) {
            alert("帳號長度輸入錯誤");
            return;
        }

        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/purchaseBond_N/Bank4/B/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/'+ rev_txnseq  + '/' + rev_reason);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/purchaseBond_N/Bank4/B/'+from_bank+'/'+ from_customer + '/' + to_bank +'/'+
            to_customer +'/'+ amount +'/'+ securities_id +'/'+ payment + '/'+ rev_txnseq  + '/' + rev_reason,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //alert(JSON.stringify(data));
                //alert("Ajax call success : txnseq="+data.responseText);
                var tmpstr1 = data.responseText
                var len1 = tmpstr1.length
                var tmpstr2 = tmpstr1.slice(0,len1);
                $('#data_t4').val(tmpstr2);
                txnList.push(tmpstr2);
                //console.log(data);
                hideTxnTable();
                showTxnTable4();
            }
        });
    };

    submitAjax();

}



function setCustomerInfo() {

    //alert("purchaseBond")

    $('#data_t5').val("");

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        //var to_bank = $('#to_bank_5').val();
        var to_customer = $('#to_customer_5').val();
        var to_name = $('#to_name_5').val();
        var to_type = $('#to_type_5').val();


        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/setCustomerInfo/Bank4/'+ to_customer +'/' + to_name + '/' + to_type);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/setCustomerInfo/Bank4/'+ to_customer +'/' + to_name + '/' + to_type,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                var tmpstr1 = data.responseText
                var len1 = tmpstr1.length
                var tmpstr2 = tmpstr1.slice(0,len1);
                $('#data_t5').val(tmpstr2);
                alert("設定客戶資料成功");
                //console.log(data);
                hideTxnTable();
                showTxnTable5();
            }
        });
    };

    submitAjax();


}


function depositCBBalance() {

    //alert("purchaseBond")

    //var balance = $('#cb_balance_6').val();

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        //var to_bank = $('#to_bank_5').val();
        var cb_balance = removeComma($('#cb_balance_6').val());

        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3000/depositCBBalance/Bank4/'+ cb_balance);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3000/depositCBBalance/Bank4/'+ cb_balance,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //var tmpstr1 = data.responseText
                //var len1 = tmpstr1.length
                //var tmpstr2 = tmpstr1.slice(0,len1);
                //$('#data_t5').val(tmpstr2);
                alert("存入同資款項成功");
                //console.log(data);
                hideTxnTable();
                showTxnTable6();
            }
        });
    };

    submitAjax();


}


function depositDLTBalance() {

    //alert("purchaseBond")

    //var balance = $('#cb_balance_6').val();

    var submitAjax = function() {

        //var from_bank_name = $('#from_bank').val();
        //var to_bank = $('#to_bank_5').val();
        var dlt_acc = $('#dlt_acc_7').val();
        var dlt_balance = removeComma($('#dlt_balance_7').val());

        //'/purchaseBond/Bank2/:frombank/:fromcustomer/:tobank/:tocustomer/:amount/:securities_id/:payment'
        alert('http://127.0.0.1:3003/depositDLTBalance/Bank4/'+ dlt_acc + '/'  + dlt_balance);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/depositDLTBalance/Bank4/'+ dlt_acc + '/'  + dlt_balance,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //var tmpstr1 = data.responseText
                //var len1 = tmpstr1.length
                //var tmpstr2 = tmpstr1.slice(0,len1);
                //$('#data_t5').val(tmpstr2);
                alert("存入交易準備金成功");
                //console.log(data);
                hideTxnTable();
                showTxnTable8();
            }
        });
    };

    submitAjax();


}



function switchMode() {

    var submitAjax = function() {

        var process_mode = $('#process_mode').val();
        //var process_timeout = $('#process_timeout').val();
        var process_timeout = 600;

        alert('http://127.0.0.1:3003/switchMode/Bank4/'+ process_mode + "/" + process_timeout);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/switchMode/Bank4/'+ process_mode + "/" + process_timeout,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //var tmpstr1 = data.responseText
                //var len1 = tmpstr1.length
                //var tmpstr2 = tmpstr1.slice(0,len1);
                //$('#data_t5').val(tmpstr2);
                alert("切換處理模式成功");
                //console.log(data);
                hideTxnTable();
                showTxnTable7();
            }
        });
    };

    submitAjax();

}


function testMode() {

    var submitAjax = function() {

        var test_mode = $('#test_mode_9').val();
        var test_type = $('#test_type_9').val();
        var test_bank = $('#to_bank_9').val();
        var test_period = $('#test_period_9').val();
        var test_flag = $('#test_flag_9').val();

        //router.get( '/testMode/:mode/:bank/:type/:interval/:is_on', function(request, response) {
        alert('http://127.0.0.1:3003/testMode/'+ test_mode + "/" + test_bank + "/" + test_type + "/" + test_period + "/" + test_flag);

        // 使用 ajax() 來呼叫 REST API
        return $.ajax({
            url: 'http://127.0.0.1:3003/testMode/'+ test_mode + "/" + test_bank + "/" + test_type + "/" + test_period + "/" + test_flag,

            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //var tmpstr1 = data.responseText
                //var len1 = tmpstr1.length
                //var tmpstr2 = tmpstr1.slice(0,len1);
                //$('#data_t5').val(tmpstr2);
                alert("切換自動測試模式成功");
                //console.log(data);
                hideTxnTable();
                showTxnTable9();
            }
        });
    };

    submitAjax();

}




/*
function query_txn1() {

    //alert("query_txn1() ");
    //alert(txnList);

    // $('#data_t4').val("");

    qrytable_data_array = [];  // initialize array

    var txnseq;

    var submitAjax2 = function() {

        // var txnseq = $('#txserno_1').val();

        //alert('http://127.0.0.1:3003/checkTxnInfo/Bank4/'+ txnseq);

        // 使用 ajax() 來呼叫 REST API
        // transferTo/Bank4/:amount//:frombank/:tobank/:fromacc/:toacc'
        //
        $.ajax({
            url: 'http://127.0.0.1:3003/checkTxnInfo/Bank4/'+ txnseq,
            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //alert(data.responseText);
                //alert("交易資訊"+data.responseText);
                //console.log(data);
                var res = data.responseText;
                addTransactionToTable(res);
            }
        });

    };

    for(var i=0; i< txnList.length; i++) {
        txnseq = txnList[i];
        submitAjax2();
    }

}
*/

/*
function addTransactionToTable(param_str) {
    var s = param_str.split(" ");
    var s8 = soliditytsConverter(s[8]);
    var s10 = s[10];
    if(s10 == "NA") {
        s10 = "";
    }
    qrytable_data_array[qrytable_data_array.length] = new Transaction(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s8, s[9], s10, s[11]);
}
*/

function soliditytsConverter(ts){

    if (ts == 0) return "";
    var t = ts.substr(0,10);
    var a = new Date(t * 1000);
    var year = a.getFullYear();
    var month = a.getMonth()+1;
    if(month<10) {
        month = "0" + month;
    }
    var date = a.getDate();
    if(date<10) {
        date = "0" + date;
    }
    var hour = a.getHours();
    if(hour<10) {
        hour = "0" + hour;
    }
    var min = a.getMinutes();
    if(min<10) {
        min = "0" + min;
    }
    var sec = a.getSeconds();
    if(sec<10) {
        sec = "0" + sec;
    }

    return year + '/' + month + '/' + date + '  ' + hour + ':' + min + ':' +sec;
}

//this_txn.from_bank_id, this_txn.from_customer_id,
//this_txn.to_bank_id, this_txn.to_customer_id,
//    this_txn.securities_amount, this_txn.securities_id, this_txn.payment, this_txn.timestamp

/*
function Transaction ( txnseq, from_bank, from_customer, to_bank, to_customer, amount, securities_id, payment, timestamp,
                       txnstate, _rev_txnseq, _causer
) {
    this.filler = "";
    this.txnseq = txnseq;
    this.from_bank = from_bank;
    this.from_customer = from_customer;
    this.to_bank = to_bank;
    this.to_customer = to_customer;
    this.amount = addComma(amount);
    this.securities_id = securities_id;
    this.payment = addComma(payment);
    this.timestamp = timestamp;
    this.txnstate = txnstate;
    this.rev_txnseq = _rev_txnseq;
    this.causer = _causer;

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

};
*/


function unlockAccount() {


    var _password = $('#m_password').val();
    var _period = 99999;

    //alert(_password);

    var submitAjax2 = function() {

        // var txnseq = $('#txserno_1').val();

        //alert('http://127.0.0.1:3001/checkTxnInfo/Bank2/'+ txnseq);

        // 使用 ajax() 來呼叫 REST API
        // transferTo/Bank2/:amount//:frombank/:tobank/:fromacc/:toacc'
        //
        $.ajax({
            url: 'http://127.0.0.1:3003/unlockAccount/'+ _password + '/' + _period,
            type: "GET",
            async: false,
            dataType: "text",
            success: function (data) {
                //alert(data.responseText);
                alert("解鎖完成");
                //console.log(data);
                //var res = data.responseText;
                //addTransactionToTable(res);
            },
            error: function (xhr, ajaxOptions, thrownError) {
              alert("解鎖失敗");
            }
        });

    };
    submitAjax2();
}

function lockAccount() {



    var submitAjax2 = function() {

        // var txnseq = $('#txserno_1').val();

        //alert('http://127.0.0.1:3001/checkTxnInfo/Bank2/'+ txnseq);

        // 使用 ajax() 來呼叫 REST API
        // transferTo/Bank2/:amount//:frombank/:tobank/:fromacc/:toacc'
        //
        $.ajax({
            url: 'http://127.0.0.1:3003/lockAccount',
            type: "GET",
            async: false,
            dataType: "text",
            complete: function (data) {
                //alert(data.responseText);
                alert("鎖定完成");
                //console.log(data);
                //var res = data.responseText;
                //addTransactionToTable(res);
            }
        });

    };
    submitAjax2();
}


function cancelTransactions() {

    var selected_raw_array = [];

    selected_raw_array = qry_txn_table.rows('.selected').data();

    if(selected_raw_array.length==0) {
        alert("沒有選擇任何交易");
        return;
    }

    for(var i=0; i<selected_raw_array.length; i++) {

        var txn = selected_raw_array[i].txnseq;
        var bank1 = txn.substr(0,5);

        if(bank1 != "Bank4") {
            alert("不可取消他行交易");
            return;
        }

        var _from_bank = selected_raw_array[i].from_bank;
        var _to_bank = selected_raw_array[i].to_bank;

        //alert(_from_bank+" "+_to_bank);

        var submitAjax2 = function() {

            // var txnseq = $('#txserno_1').val();

            //alert('http://127.0.0.1:3001/checkTxnInfo/Bank2/'+ txnseq);

            // 使用 ajax() 來呼叫 REST API
            // transferTo/Bank4/:amount//:frombank/:tobank/:fromacc/:toacc'
            //
            $.ajax({
                url: 'http://127.0.0.1:3003/cancelTransaction/'+ _from_bank + '/' + _to_bank + '/' + txn,
                type: "GET",
                async: false,
                dataType: "text",
                complete: function (data) {
                    //alert(data.responseText);
                    alert("交易完成");
                    //console.log(data);
                    //var res = data.responseText;
                    //addTransactionToTable(res);
                }
            });

        };
        submitAjax2();
    }
}


function displayBlock() {

    //document.getElementById("BLOCK_TIMELINE").innerHTML = "";

    var selected_raw_array = [];

    //selected_raw_array = qry_txn_table.rows('.selected').data();
    selected_raw_array = qry_txn_table.rows('.selected').data();

    if(selected_raw_array.length!=1) {
        //alert("一次只能選一個交易");
        alert("一次只能選一個交易。");
        return;
    }

    var txseq = "NA";
    var txhash1 = "NA";
    var blocknum1 = "NA";
    var txhash2 = "NA";
    var blocknum2 = "NA";
    var txhash3 = "NA";
    var blocknum3 = "NA";
    var txhash4 = "NA";
    var blocknum4 = "NA";
    var txhash5 = "NA";
    var blocknum5 = "NA";

    for(var i=0; i<selected_raw_array.length; i++) {

        //var txn = selected_raw_array[i].txnseq;

        var jStr = JSON.stringify(selected_raw_array[i]);

        var fields = jStr.split(",");

        for (var i;i<fields.length;i++) {

            if( fields[i].indexOf("\"txnseq\":") !=-1 ) {
                //alert(fields[i])
                txseq = fields[i].substr(10);
                txseq = txseq.replace(/\"|'/g,'')
                continue;
            } else if( fields[i].indexOf("\"txhash1\":") !=-1 ) {
                txhash1 = fields[i].substr(11, 66);
                continue;
            } else if( fields[i].indexOf("\"blocknum1\":") !=-1 ) {
                blocknum1 = fields[i].substring(12);
                blocknum1 = blocknum1.replace(/\{|}/g,'')
                continue;
            } else if( fields[i].indexOf("\"txhash2\":") !=-1 ) {
                txhash2 = fields[i].substr(11, 66);
                continue;
            } else if( fields[i].indexOf("\"blocknum2\":") !=-1 ) {
                blocknum2 = fields[i].substring(12);
                blocknum2 = blocknum2.replace(/\{|}/g,'')
                continue;
            } else if( fields[i].indexOf("\"txhash3\":") !=-1 ) {
                txhash3 = fields[i].substr(11, 66);
                //alert(fields[i]);
                continue;
            } else if( fields[i].indexOf("\"blocknum3\":") !=-1 ) {
                blocknum3 = fields[i].substring(12);
                blocknum3 = blocknum3.replace(/\{|}/g,'')
                continue;
            } else if( fields[i].indexOf("\"txhash4\":") !=-1 ) {
                txhash4 = fields[i].substr(11, 66);
                continue;
            } else if( fields[i].indexOf("\"blocknum4\":") !=-1 ) {
                blocknum4 = fields[i].substring(12);
                blocknum4 = blocknum4.replace(/\{|}/g,'')
                continue;
            } else if( fields[i].indexOf("\"txhash5\":") !=-1 ) {
                txhash5 = fields[i].substr(11, 66);
                continue;
            } else if( fields[i].indexOf("\"blocknum5\":") !=-1 ) {
                blocknum5 = fields[i].substring(12);
                blocknum5 = blocknum5.replace(/\{|}/g,'')
                continue;
            }
        }


    }

    //alert(txn+"**"+txhash1+"**"+blocknum1+"**"+txhash2+"**"+blocknum2+"**"+txhash3+"**"+blocknum3+"**"+txhash4+"**"+blocknum4+"**"+txhash5+"**"+blocknum5);

    /*
    var htmlstr = '<div class="row"><div class="col-lg-auto">' +
            '<div class="m-portlet m-portlet--full-height " data-portlet="true" id="m_portlet_display_blocks">' +
            '<div class="m-portlet__head"><div class="m-portlet__head-caption"><div class="m-portlet__head-title"><span class="m-portlet__head-icon">' +
            '<i class="flaticon-graph"></i></span> <h3 class="m-portlet__head-text"> 檢視交易歷史 </h3></div></div>' +
            '<div class="m-portlet__head-tools"><ul class="m-portlet__nav"><li class="m-portlet__nav-item">' +
            '<a href=""  data-portlet-tool="toggle" class="m-portlet__nav-link m-portlet__nav-link--icon"><i class="la la-angle-down"></i></a></li>' +
            '<li class="m-portlet__nav-item"><a href="#" data-portlet-tool="fullscreen" class="m-portlet__nav-link m-portlet__nav-link--icon">' +
            '<i class="la la-expand"></i></a></li><li class="m-portlet__nav-item">' +
            '<a href="#" data-portlet-tool="remove" class="m-portlet__nav-link m-portlet__nav-link--icon"><i class="la la-close"></i></a></li></ul></div></div>' +
            '<div class="m-portlet__body"><div class="m-scrollable" data-scrollbar-shown="true" data-scrollable="true" >'
    */

    var res = $.ajax({
        type: "GET",
        url: 'http://127.0.0.1:3003/queryBlock/' + txseq + '/' + txhash1 + '/' + blocknum1 + '/'  + txhash2 + '/' + blocknum2 +'/'
        + txhash3 + '/' + blocknum3 + '/' +  txhash4 + '/' + blocknum4 + '/' +  txhash5 + '/' + blocknum5 ,
        async: false
    }).responseText;


    /*
    htmlstr += res;
    htmlstr += '</div></div></div></div></div>';
    */

    //alert(res);

    document.getElementById("BLOCK_TIMELINE").innerHTML = res;

    $('#m_showblock_modal').modal('show');

}
