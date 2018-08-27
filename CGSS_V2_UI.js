var isManTableShow = true;

var qry_txn_table;

var txnList = [];   // global vars for datatables
//var txnData;   // global vars for datatables
var qrytable_data_array = [];

qryTxnTable2();

$('#m_datetimepicker_1').datepicker({
});

$('#m_datetimepicker_2').datepicker({
});

//setInterval(queryAccBalance, 10000); //300000 MS == 5 minutes


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

    /*
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
    */

    tmpStr += '{ "txnstate" : "Finished" },';
    cond_cnt++;

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

function qryTxnTable2() {

    //document.getElementById("BLOCK_TIMELINE").innerHTML="";

    qrytable_data_array = [];

    //var qry_string = $('#data_qry_txn_string').val();

    //var qry_string = "";
    var qry_string = $('#data_qry_txn_string').val();

    //alert(qry_string);

    if(qry_string.length == 0) {
        qry_string = '{ "$or" : [ { "txnstate" : "Finished" }, { "txnstate" : "Cancelled" } ] }';
    }

    var arrayStr = $.ajax({
        type: "GET",
        url: 'http://127.0.0.1:3005/checkTxnInfo/'+qry_string,
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
            { data: 'txntype', width: 50,
                "render": function ( data, type, row, meta ) {
                    return '<span class="titleFont">'+data+'</span>';
                }
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
            { data: 'timestamp', width: 100,
                "render": function ( data, type, row, meta ) {
                    return soliditytsConverter(row.timestamp+" ");
                }
            },
            { data: 'txnstate' , width: 100,

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
            { data: 'rev_txnseq', width: 50, "visible": false,
            },
            { data: 'causer' , width: 50,
                "visible": true,
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

