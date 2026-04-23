/* ============================================================
   app.js — BhumiSetu Frontend Logic (Simulated Backend)
   ============================================================ */

// ----------------------------------------------------------------
// SIMULATED BACKEND: In-memory land records database
// In a real app this data would come from a server (PHP/Node/etc.)
// ----------------------------------------------------------------
const landDatabase = new Map([
    ["KH-12/456",  { owner: "Arjun Mehta",    area: "0.75 acre",   location: "Village Rampur",     taxId: "PTX-1001", lastTaxPaid: "2024", propertyValue: 1250000 }],
    ["SUR-987",    { owner: "Priya Singh",     area: "1200 sq ft",  location: "Greenfield Colony",  taxId: "PTX-2102", lastTaxPaid: "2023", propertyValue: 890000  }],
    ["PLOT/22A",   { owner: "Ramesh K.",       area: "2.5 acres",   location: "Industrial Zone",    taxId: "PTX-3345", lastTaxPaid: "2025", propertyValue: 3200000 }],
    ["KH-78/09",   { owner: "Sunita Devi",     area: "0.5 acre",    location: "Kheda Village",      taxId: "PTX-4521", lastTaxPaid: "2022", propertyValue: 650000  }],
    ["SUR-1122",   { owner: "Vikram Jadhav",   area: "850 sq yd",   location: "Nagpur Urban",       taxId: "PTX-6789", lastTaxPaid: "2024", propertyValue: 1850000 }]
]);

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------

/**
 * Look up a land record by survey/khasra number (case-insensitive).
 * @param {string} surveyNum
 * @returns {object|null}
 */
function getLandRecord(surveyNum) {
    if (!surveyNum) return null;
    for (const [key, value] of landDatabase.entries()) {
        if (key.toLowerCase() === surveyNum.toLowerCase()) {
            return { surveyNumber: key, ...value };
        }
    }
    return null;
}

/**
 * Look up a property by survey number OR tax property ID.
 * @param {string} inputId
 * @returns {object|null}
 */
function getPropertyBySurveyOrId(inputId) {
    if (!inputId) return null;
    for (const [survey, data] of landDatabase.entries()) {
        if (
            survey.toLowerCase() === inputId.toLowerCase() ||
            (data.taxId && data.taxId.toLowerCase() === inputId.toLowerCase())
        ) {
            return { surveyNumber: survey, ...data };
        }
    }
    return null;
}

/**
 * Calculate outstanding property tax.
 * Formula: 2% of property value per year outstanding.
 * @param {number} propertyValue
 * @param {string|number} lastPaidYear
 * @param {string|number} currentYear
 * @returns {number}
 */
function computeTaxDue(propertyValue, lastPaidYear, currentYear) {
    if (!propertyValue) return 0;
    const lastPaid = parseInt(lastPaidYear, 10);
    const curr = parseInt(currentYear, 10);
    if (isNaN(lastPaid)) return Math.round(propertyValue * 0.02);
    let yearsDue = curr - lastPaid;
    if (yearsDue <= 0) return 0;
    return Math.round(propertyValue * 0.02 * yearsDue);
}

// ----------------------------------------------------------------
// RECENT RECORDS
// ----------------------------------------------------------------
let recentRecords = [];

function addRecentRecord(surveyNumber, ownerName) {
    // Remove duplicate if already present
    recentRecords = recentRecords.filter(rec => rec.survey !== surveyNumber);
    recentRecords.unshift({ survey: surveyNumber, owner: ownerName });
    if (recentRecords.length > 4) recentRecords.pop();
    renderRecentList();
}

function renderRecentList() {
    const container = document.getElementById("recentRecordsList");
    if (!container) return;

    if (recentRecords.length === 0) {
        container.innerHTML = '<span class="badge">— No records yet —</span>';
        return;
    }

    container.innerHTML = recentRecords.map(rec => `
        <div class="record-item">
            <span><i class="fas fa-map-pin"></i> <strong>${rec.survey}</strong> (${rec.owner || '—'})</span>
            <button class="reload-btn" data-survey="${rec.survey}">View</button>
        </div>
    `).join('');

    // Attach click listeners to each "View" button
    document.querySelectorAll('.reload-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const survey = btn.getAttribute('data-survey');
            if (survey) {
                document.getElementById('surveyNumber').value = survey;
                triggerLandSearch(survey);
            }
            e.stopPropagation();
        });
    });
}

// ----------------------------------------------------------------
// LAND RECORD SEARCH
// ----------------------------------------------------------------

/**
 * Perform a land record lookup and update the result box.
 * @param {string} surveyNum
 */
function triggerLandSearch(surveyNum) {
    const record = getLandRecord(surveyNum);
    const resultDiv = document.getElementById("landRecordResult");

    if (record) {
        addRecentRecord(record.surveyNumber, record.owner);
        resultDiv.innerHTML = `
            <i class="fas fa-check-circle" style="color:#2b7a4b;"></i> <strong>Land Record Found</strong><br>
            📍 <strong>Survey No:</strong> ${record.surveyNumber}<br>
            👤 <strong>Owner:</strong> ${record.owner}<br>
            📏 <strong>Area:</strong> ${record.area}<br>
            🏘️ <strong>Location:</strong> ${record.location}<br>
            🏷️ <strong>Property Tax ID:</strong> ${record.taxId}<br>
            💰 <strong>Assessed Value:</strong> ₹${record.propertyValue.toLocaleString()}<br>
            <span class="badge">✅ Digitally Verified</span>
        `;
    } else {
        resultDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            No land record found for "<strong>${surveyNum}</strong>".
            Please check the survey number.<br>
            💡 Try: <em>KH-12/456</em>, <em>SUR-987</em>, <em>PLOT/22A</em>
        `;
    }
}

// Search button click
document.getElementById("searchRecordBtn").addEventListener("click", () => {
    const surveyInput = document.getElementById("surveyNumber").value.trim();

    if (!surveyInput) {
        document.getElementById("landRecordResult").innerHTML =
            `<i class="fas fa-info-circle"></i> Please enter a Survey / Khasra number.`;
        return;
    }

    triggerLandSearch(surveyInput);
});

// ----------------------------------------------------------------
// PROPERTY TAX
// ----------------------------------------------------------------
let currentTaxDue = 0;
let currentTaxPropertyData = null;

function updateTaxDisplay() {
    const propertyId      = document.getElementById("taxPropertyId").value.trim();
    const assessmentYear  = document.getElementById("assessmentYear").value;
    const taxDiv          = document.getElementById("taxDueDisplay");
    const paymentSection  = document.getElementById("paymentSection");
    const payNowBtn       = document.getElementById("payNowBtn");

    if (!propertyId) {
        taxDiv.innerHTML = `💡 Enter Property ID or Survey Number to check tax due.`;
        paymentSection.style.display = "none";
        return;
    }

    const property = getPropertyBySurveyOrId(propertyId);

    if (!property) {
        taxDiv.innerHTML = `<i class="fas fa-times-circle"></i> Property not found. Please check ID or Survey No.`;
        paymentSection.style.display = "none";
        currentTaxDue = 0;
        currentTaxPropertyData = null;
        return;
    }

    const lastPaid  = property.lastTaxPaid || "2023";
    const dueAmount = computeTaxDue(property.propertyValue, lastPaid, assessmentYear);
    currentTaxDue           = dueAmount;
    currentTaxPropertyData  = property;

    const statusText = dueAmount === 0
        ? `✅ No tax due. All clear!`
        : `⚠️ Total Tax Due: <strong style="font-size:1.2rem;">₹${dueAmount.toLocaleString()}</strong> for year ${assessmentYear}.`;

    taxDiv.innerHTML = `
        <i class="fas fa-chart-bar"></i> ${statusText}<br>
        <span style="font-size:0.75rem;">
            Last tax paid: ${lastPaid} | Property Value: ₹${property.propertyValue.toLocaleString()}
        </span>
    `;

    // Show payment section
    paymentSection.style.display = "block";
    if (dueAmount > 0) {
        payNowBtn.innerHTML = `<i class="fas fa-credit-card"></i> Pay ₹${dueAmount.toLocaleString()} Now`;
        payNowBtn.disabled  = false;
    } else {
        payNowBtn.innerHTML = `<i class="fas fa-check-circle"></i> No Dues — Paid Up`;
        payNowBtn.disabled  = true;
    }
}

// "Check Tax Due" button
document.getElementById("checkTaxBtn").addEventListener("click", updateTaxDisplay);

// Clear display when input is emptied
document.getElementById("taxPropertyId").addEventListener("input", () => {
    if (document.getElementById("taxPropertyId").value.trim() === "") {
        document.getElementById("taxDueDisplay").innerHTML = `💡 Enter Property ID to calculate tax amount.`;
        document.getElementById("paymentSection").style.display = "none";
    }
});

// ----------------------------------------------------------------
// PAYMENT (Demo / Simulation)
// ----------------------------------------------------------------
document.getElementById("payNowBtn").addEventListener("click", () => {
    const paymentMsg = document.getElementById("paymentMsg");

    if (!currentTaxPropertyData) {
        paymentMsg.innerHTML = "❌ No property selected. Check tax due first.";
        return;
    }

    if (currentTaxDue <= 0) {
        paymentMsg.innerHTML = "✨ No outstanding tax! You are up to date.";
        return;
    }

    const { owner, surveyNumber } = currentTaxPropertyData;
    const year = document.getElementById("assessmentYear").value;

    // Update in-memory record (simulating DB write)
    const updatedRecord = landDatabase.get(surveyNumber);
    if (updatedRecord) {
        updatedRecord.lastTaxPaid = year;
        landDatabase.set(surveyNumber, updatedRecord);
        currentTaxPropertyData.lastTaxPaid = year;
    }

    paymentMsg.style.color = "#2b7a4b";
    paymentMsg.innerHTML = `
        ✅ Payment of <strong>₹${currentTaxDue.toLocaleString()}</strong> successful for ${year}.<br>
        Receipt sent to registered mobile. Thank you, <strong>${owner}</strong>!
    `;

    // Refresh tax display after short delay (will now show ₹0 due)
    setTimeout(() => {
        updateTaxDisplay();
        setTimeout(() => { paymentMsg.innerHTML = ""; }, 4000);
    }, 1200);
});

// ----------------------------------------------------------------
// NAVIGATION (smooth scroll)
// ----------------------------------------------------------------
document.getElementById("navHome").addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("navRecords").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("landRecordCard").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("navTax").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("taxCard").scrollIntoView({ behavior: "smooth" });
});

// ----------------------------------------------------------------
// ON LOAD: Pre-populate recent records for better first-run UX
// ----------------------------------------------------------------
window.addEventListener("load", () => {
    recentRecords.push({ survey: "KH-12/456", owner: "Arjun Mehta" });
    recentRecords.push({ survey: "SUR-987",   owner: "Priya Singh" });
    renderRecentList();
});
