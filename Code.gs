// ============================================================
// Panjamugam Residency — Google Apps Script Backend
// Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

var SHEET_ID = '1_Qn6kmC_gPpRT7XWG929C-ZgIdnQkEVWS-F2EaM1KeE';
var ss = SpreadsheetApp.openById(SHEET_ID);

// ── CORS HEADERS ─────────────────────────────────────────────
function makeResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doOptions(e) {
  return ContentService.createTextOutput('');
}

// ── ROUTER ───────────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action || '';
  var result;
  try {
    if      (action === 'getTransactions') result = getTransactions();
    else if (action === 'getSummary')      result = getSummary();
    else if (action === 'getRooms')        result = getRooms();
    else if (action === 'getGuests')       result = getGuests();
    else if (action === 'lookupGuest')     result = lookupGuest(e.parameter.phone);
    else if (action === 'getUnpaidRooms')  result = getUnpaidRooms();
    else                                   result = {success: false, error: 'Unknown action'};
  } catch(err) {
    result = {success: false, error: err.toString()};
  }
  return makeResponse(result);
}

function doPost(e) {
  var action = e.parameter.action || '';
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch(err) {}
  var result;
  try {
    if      (action === 'addEntry')    result = addEntry(data);
    else if (action === 'updateRoom')  result = updateRoom(data);
    else if (action === 'swapRoom')    result = swapRoom(data);
    else if (action === 'checkin')     result = checkinGuest(data);
    else                               result = {success: false, error: 'Unknown action'};
  } catch(err) {
    result = {success: false, error: err.toString()};
  }
  return makeResponse(result);
}

// ── SETUP ────────────────────────────────────────────────────
function setupSheets() {
  var sheets = {
    'Accounts': ['Date','Description','Income','Expense','Mode','Room','Count','Category'],
    'Rooms': ['RoomID','Status','GuestName','GuestPhone','GuestAddress','GuestAadhar',
              'GuestVisits','GuestReturning','CheckIn','CheckOut','SwapReason'],
    'Guests': ['Phone','Name','Address','Aadhar','FirstVisit','VisitCount','LastRoom','LastVisit'],
    'Settings': ['Key','Value']
  };

  Object.keys(sheets).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, sheets[name].length).setValues([sheets[name]]);
      sheet.getRange(1, 1, 1, sheets[name].length)
        .setBackground('#1A1208').setFontColor('#ffffff').setFontWeight('bold');
    }
  });

  // Init rooms if empty
  var roomSheet = ss.getSheetByName('Rooms');
  if (roomSheet.getLastRow() <= 1) {
    var rooms = ['101','102','103','104','105','201','202','203','204','205'];
    rooms.forEach(function(r) {
      roomSheet.appendRow([r,'available','','','','','','','','','']);
    });
  }

  return {success: true, message: 'Sheets set up successfully'};
}

// ── ACCOUNTS ─────────────────────────────────────────────────
function getTransactions() {
  var sheet = ss.getSheetByName('Accounts');
  if (!sheet || sheet.getLastRow() <= 1) return {success: true, data: []};

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  var txns = [];
  data.forEach(function(row) {
    if (!row[1]) return; // skip empty desc
    var date = row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Kolkata', 'yyyy-MM-dd') : '';
    var income = parseFloat(row[2]) || 0;
    var expense = parseFloat(row[3]) || 0;
    if (!income && !expense) return;
    txns.push({
      date: date,
      month: date ? date.slice(0,7) : '',
      description: row[1].toString(),
      income: income,
      expense: expense,
      mode: row[4] ? row[4].toString() : '',
      room: row[5] ? row[5].toString() : '',
      count: parseFloat(row[6]) || 0,
      category: row[7] ? row[7].toString() : ''
    });
  });
  return {success: true, data: txns.slice(-100)};
}

function addEntry(data) {
  var sheet = ss.getSheetByName('Accounts');
  var date = data.date ? new Date(data.date) : new Date();
  sheet.appendRow([
    date,
    data.description || '',
    data.income || '',
    data.expense || '',
    data.mode || '',
    data.room || '',
    data.count || '',
    data.category || ''
  ]);
  return {success: true, message: 'Entry added'};
}

function getSummary() {
  var txns = getTransactions().data;
  var now = new Date();
  var thisMonth = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM');

  var DRAWING_CATS = ['Owner Drawing','Manager Commission'];
  var OPEX_CATS = ['Staff Salary','Salary Advance','Staff Payment','Electricity',
                   'Water','Telecom','Laundry','Cleaning','Maintenance','Linen',
                   'Pooja','Operations','Other'];

  var monthly = {};
  var yearIncome=0, yearOpex=0, yearDrawing=0, yearRooms=0;
  var cashInHand=0, cashInAccount=0;

  txns.forEach(function(t) {
    var m = t.month;
    if (!m) return;
    if (!monthly[m]) monthly[m] = {income:0,opex:0,drawing:0,rooms:0,op_profit:0};

    monthly[m].income += t.income;
    if (DRAWING_CATS.indexOf(t.category) >= 0) {
      monthly[m].drawing += t.expense;
      yearDrawing += t.expense;
    } else if (OPEX_CATS.indexOf(t.category) >= 0) {
      monthly[m].opex += t.expense;
      yearOpex += t.expense;
    }
    monthly[m].rooms += t.count;
    yearIncome += t.income;
    yearRooms += t.count;

    // Cash position
    var ml = t.mode.toLowerCase();
    var isCash = ml.indexOf('cash') >= 0 && ml.indexOf('online') < 0;
    var isOnline = ml.indexOf('online') >= 0 || ml.indexOf('upi') >= 0 || ml.indexOf('gpay') >= 0;
    if (isCash) { cashInHand += t.income - t.expense; }
    if (isOnline) { cashInAccount += t.income - t.expense; }
  });

  Object.keys(monthly).forEach(function(m) {
    monthly[m].op_profit = monthly[m].income - monthly[m].opex;
  });

  var cur = monthly[thisMonth] || {income:0,opex:0,drawing:0,rooms:0,op_profit:0};
  var monthlyList = Object.keys(monthly).sort().map(function(m) {
    return {month:m, income:monthly[m].income, opex:monthly[m].opex,
            drawing:monthly[m].drawing, op_profit:monthly[m].op_profit, rooms:monthly[m].rooms};
  });

  // Cat breakdown
  var catBreakdown = {};
  txns.forEach(function(t) {
    if (t.expense) {
      var cat = t.category || 'Other';
      catBreakdown[cat] = (catBreakdown[cat] || 0) + t.expense;
    }
  });

  return {
    success: true,
    this_month: thisMonth,
    month_income: cur.income,
    month_opex: cur.opex,
    month_drawing: cur.drawing,
    month_op_profit: cur.op_profit,
    month_rooms: cur.rooms,
    year_income: yearIncome,
    year_opex: yearOpex,
    year_drawing: yearDrawing,
    year_op_profit: yearIncome - yearOpex,
    year_rooms: yearRooms,
    monthly: monthlyList,
    cat_breakdown: catBreakdown,
    cash_in_hand: cashInHand,
    cash_in_account: cashInAccount
  };
}

// ── ROOMS ────────────────────────────────────────────────────
function getRooms() {
  var sheet = ss.getSheetByName('Rooms');
  if (!sheet || sheet.getLastRow() <= 1) return {success: true, rooms: {}};

  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 11).getValues();
  var rooms = {};
  data.forEach(function(row) {
    if (!row[0]) return;
    var id = row[0].toString();
    rooms[id] = {
      status: row[1] || 'available',
      guest: row[2] ? {
        name: row[2].toString(),
        phone: row[3].toString(),
        address: row[4].toString(),
        aadhar: row[5].toString(),
        visits: parseInt(row[6]) || 1,
        returning: row[7] === true || row[7] === 'true'
      } : null,
      checked_in: row[8] ? Utilities.formatDate(new Date(row[8]), 'Asia/Kolkata', 'yyyy-MM-dd') : '',
      checked_out: row[9] ? Utilities.formatDate(new Date(row[9]), 'Asia/Kolkata', 'yyyy-MM-dd') : '',
      swap_reason: row[10] ? row[10].toString() : ''
    };
  });
  return {success: true, rooms: rooms};
}

function findRoomRow(roomId) {
  var sheet = ss.getSheetByName('Rooms');
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString() === roomId) return i + 2;
  }
  return -1;
}

function updateRoom(data) {
  var sheet = ss.getSheetByName('Rooms');
  var row = findRoomRow(data.room);
  if (row < 0) return {success: false, error: 'Room not found'};

  var g = data.guest || {};
  var checkin = data.checked_in ? new Date(data.checked_in) : '';
  var checkout = data.checked_out ? new Date(data.checked_out) : '';

  sheet.getRange(row, 1, 1, 11).setValues([[
    data.room,
    data.status || 'available',
    g.name || '',
    g.phone || '',
    g.address || '',
    g.aadhar || '',
    g.visits || '',
    g.returning || false,
    checkin,
    checkout,
    data.swap_reason || ''
  ]]);

  // Return updated room
  var updated = {
    status: data.status || 'available',
    guest: g.name ? g : null,
    checked_in: data.checked_in || '',
    checked_out: data.checked_out || ''
  };
  return {success: true, room: updated};
}

function swapRoom(data) {
  var fromRow = findRoomRow(data.from_room);
  var toRow = findRoomRow(data.to_room);
  if (fromRow < 0 || toRow < 0) return {success: false, error: 'Room not found'};

  var sheet = ss.getSheetByName('Rooms');
  var fromData = sheet.getRange(fromRow, 1, 1, 11).getValues()[0];

  // Move guest to new room
  sheet.getRange(toRow, 1, 1, 11).setValues([[
    data.to_room,
    'occupied',
    fromData[2], fromData[3], fromData[4], fromData[5],
    fromData[6], fromData[7], fromData[8], fromData[9],
    data.reason || ''
  ]]);

  // Clear old room
  sheet.getRange(fromRow, 1, 1, 11).setValues([[
    data.from_room, 'available', '', '', '', '', '', false, '', '', ''
  ]]);

  // Increment guest visit count in Guests sheet
  if (fromData[3]) {
    incrementGuestVisit(fromData[3].toString(), data.to_room, data.reason);
  }

  return {success: true, from: data.from_room, to: data.to_room};
}

// ── GUESTS ───────────────────────────────────────────────────
function getGuests() {
  var sheet = ss.getSheetByName('Guests');
  if (!sheet || sheet.getLastRow() <= 1) return {success: true, guests: {}};
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  var guests = {};
  data.forEach(function(row) {
    if (!row[0]) return;
    guests[row[0].toString()] = {
      phone: row[0].toString(), name: row[1].toString(),
      address: row[2].toString(), aadhar: row[3].toString(),
      first_visit: row[4], visit_count: parseInt(row[5]) || 1,
      last_room: row[6].toString(), last_visit: row[7]
    };
  });
  return {success: true, guests: guests};
}

function lookupGuest(phone) {
  if (!phone) return {success: true, found: false};
  var sheet = ss.getSheetByName('Guests');
  if (!sheet || sheet.getLastRow() <= 1) return {success: true, found: false};
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString() === phone.toString()) {
      return {
        success: true, found: true,
        visits: parseInt(data[i][5]) || 1,
        guest: {
          phone: data[i][0].toString(),
          name: data[i][1].toString(),
          address: data[i][2].toString(),
          aadhar: data[i][3].toString()
        }
      };
    }
  }
  return {success: true, found: false};
}

function findGuestRow(phone) {
  var sheet = ss.getSheetByName('Guests');
  if (sheet.getLastRow() <= 1) return -1;
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0].toString() === phone.toString()) return i + 2;
  }
  return -1;
}

function incrementGuestVisit(phone, room, reason) {
  var sheet = ss.getSheetByName('Guests');
  var row = findGuestRow(phone);
  if (row < 0) return;
  var current = parseInt(sheet.getRange(row, 6).getValue()) || 1;
  sheet.getRange(row, 6).setValue(current + 1);
  sheet.getRange(row, 7).setValue(room);
  sheet.getRange(row, 8).setValue(new Date());
}

function checkinGuest(data) {
  var phone = (data.phone || '').toString().trim();
  var guestSheet = ss.getSheetByName('Guests');
  var isReturning = false;
  var visitCount = 1;

  if (phone) {
    var existingRow = findGuestRow(phone);
    if (existingRow > 0) {
      isReturning = true;
      visitCount = (parseInt(guestSheet.getRange(existingRow, 6).getValue()) || 1) + 1;
      // Update existing guest
      guestSheet.getRange(existingRow, 2).setValue(data.name || '');
      guestSheet.getRange(existingRow, 3).setValue(data.address || '');
      guestSheet.getRange(existingRow, 4).setValue(data.aadhar || '');
      guestSheet.getRange(existingRow, 6).setValue(visitCount);
      guestSheet.getRange(existingRow, 7).setValue(data.room || '');
      guestSheet.getRange(existingRow, 8).setValue(new Date());
    } else {
      // New guest
      guestSheet.appendRow([
        phone, data.name||'', data.address||'', data.aadhar||'',
        new Date(), 1, data.room||'', new Date()
      ]);
    }
  }

  // Update room
  var guest = {
    name: data.name||'', phone: phone,
    address: data.address||'', aadhar: data.aadhar||'',
    visits: visitCount, returning: isReturning
  };
  updateRoom({
    room: data.room,
    status: 'occupied',
    guest: guest,
    checked_in: data.checked_in || Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd'),
    checked_out: data.checked_out || ''
  });

  return {success: true, returning: isReturning, guest: guest};
}

// ── UNPAID ROOMS ─────────────────────────────────────────────
function getUnpaidRooms() {
  var rooms = getRooms().rooms;
  var txns = getTransactions().data;
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');

  var paidRooms = {};
  txns.forEach(function(t) {
    if (t.income && t.date === today) {
      if (t.room) {
        t.room.split(',').forEach(function(r) { paidRooms[r.trim()] = true; });
      }
      ['101','102','103','104','105','201','202','203','204','205'].forEach(function(r) {
        if (t.description.indexOf(r) >= 0) paidRooms[r] = true;
      });
    }
  });

  var unpaid = [];
  Object.keys(rooms).forEach(function(id) {
    if (rooms[id].status === 'occupied' && !paidRooms[id]) {
      var g = rooms[id].guest || {};
      unpaid.push({room:id, guest:g.name||'Guest', phone:g.phone||'', checked_in:rooms[id].checked_in});
    }
  });
  return {success: true, unpaid: unpaid};
}
