document.getElementById('licenseForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const licensePlate = document.getElementById('licensePlate').value.toUpperCase();
    searchForViolations(licensePlate);
});

function searchForViolations(licensePlate) {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-message">Loading...</div></div>';
    removeControls();

    let apiEndpoint = `https://data.cityofnewyork.us/resource/nc67-uf89.json?plate=${encodeURIComponent(licensePlate)}`;

    fetch(apiEndpoint)
        .then(response => response.json())
        .then(data => {
            console.log(`Fetched ${data.length} violations`);

            if (data.length > 0) {
                let states = getUniqueStates(data);
                if (states.length > 1) {
                    askUserToSelectState(states, data);
                } else {
                    displayControls();
                    displayViolations(data);
                }
            } else {
                resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><div class="empty-state-message">No violations found for this license plate.</div></div>';
                clearTotals();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = '<div class="empty-state"><div class="empty-state-message">An error occurred while fetching data. Please try again.</div></div>';
            clearTotals();
        });
}

function getUniqueStates(data) {
    const statesSet = new Set();
    data.forEach(item => {
        if (item.state) {
            statesSet.add(item.state);
        }
    });
    return Array.from(statesSet);
}

function askUserToSelectState(states, data) {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p style="margin-bottom: 20px; font-size: 16px;">Multiple states found for this license plate. Please select a state:</p>';

    states.forEach(state => {
        let button = document.createElement('button');
        button.className = 'state-button';
        button.textContent = state;
        button.onclick = () => {
            displayControls();
            displayViolations(data.filter(item => item.state === state));
        };
        resultsDiv.appendChild(button);
    });
}

// Helper function to format currency
function formatCurrency(value) {
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper function to get payment status
function getPaymentStatus(violation) {
    const amountDue = parseFloat(violation.amount_due || 0);
    const amountPaid = parseFloat(violation.payment_amount || 0);

    if (amountDue === 0 || amountPaid >= amountDue) {
        return 'paid';
    } else if (amountPaid > 0) {
        return 'partial';
    }
    return 'outstanding';
}

// Helper function to get status badge HTML
function getStatusBadge(status) {
    const statusClass = `status-${status}`;
    const statusText = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partially Paid' : 'Outstanding';
    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
}

// Create detail item HTML
function createDetailItem(label, value, emptyText = 'N/A') {
    const displayValue = value || emptyText;
    const emptyClass = !value ? 'empty' : '';
    return `
        <div class="detail-item">
            <div class="detail-label">${label}</div>
            <div class="detail-value ${emptyClass}">${displayValue}</div>
        </div>
    `;
}

function displayViolations(data) {
    localStorage.setItem('currentResults', JSON.stringify(data));

    let totalViolations = data.length;
    let totalAmountDue = data.reduce((sum, violation) => sum + parseFloat(violation.amount_due || 0), 0);
    let totalPaymentAmount = data.reduce((sum, violation) => sum + parseFloat(violation.payment_amount || 0), 0);

    let htmlContent = data.map(violation => {
        const status = getPaymentStatus(violation);
        const amountDue = parseFloat(violation.amount_due || 0);
        const amountPaid = parseFloat(violation.payment_amount || 0);
        const fine = parseFloat(violation.fine_amount || 0);
        const penalty = parseFloat(violation.penalty_amount || 0);
        const interest = parseFloat(violation.interest_amount || 0);
        const reduction = parseFloat(violation.reduction_amount || 0);

        return `
            <div class="violation-card">
                <div class="violation-header">
                    <div>
                        <h3 class="violation-title">${violation.violation || 'Violation'}</h3>
                        ${violation.violation_code ? `<span class="violation-code">Code: ${violation.violation_code}</span>` : ''}
                        ${getStatusBadge(status)}
                    </div>
                    <div class="amount-badge">
                        <div class="amount-label">Amount Due</div>
                        <div class="amount-value ${status === 'paid' ? 'paid' : ''}">$${formatCurrency(amountDue)}</div>
                    </div>
                </div>

                <div class="violation-details">
                    ${createDetailItem('Issue Date', formatDate(violation.issue_date))}
                    ${createDetailItem('Violation Time', violation.violation_time)}
                    ${createDetailItem('Summons Number', violation.summons_number)}
                    ${createDetailItem('Plate ID', violation.plate)}
                    ${createDetailItem('State', violation.state)}
                    ${createDetailItem('License Type', violation.license_type)}
                </div>

                <div class="violation-details">
                    <h4 style="grid-column: 1 / -1; margin: 12px 0 8px 0; font-size: 14px; color: #666; font-weight: 600;">Vehicle Information</h4>
                    ${createDetailItem('Make', violation.vehicle_make)}
                    ${createDetailItem('Body Type', violation.vehicle_body_type)}
                    ${createDetailItem('Color', violation.vehicle_color)}
                    ${createDetailItem('Year', violation.vehicle_year)}
                    ${createDetailItem('Expiration', formatDate(violation.vehicle_expiration_date))}
                </div>

                <div class="violation-details">
                    <h4 style="grid-column: 1 / -1; margin: 12px 0 8px 0; font-size: 14px; color: #666; font-weight: 600;">Location Details</h4>
                    ${createDetailItem('Violation Location', violation.violation_location)}
                    ${createDetailItem('Street Name', violation.street_name)}
                    ${createDetailItem('Intersecting Street', violation.intersecting_street)}
                    ${createDetailItem('House Number', violation.house_number)}
                    ${createDetailItem('County', violation.violation_county)}
                    ${createDetailItem('Precinct', violation.violation_precinct)}
                    ${createDetailItem('In Front Of/Opposite', violation.violation_in_front_of_or_opposite)}
                </div>

                <div class="violation-details">
                    <h4 style="grid-column: 1 / -1; margin: 12px 0 8px 0; font-size: 14px; color: #666; font-weight: 600;">Issuer Information</h4>
                    ${createDetailItem('Issuing Agency', violation.issuing_agency)}
                    ${createDetailItem('Issuer Precinct', violation.issuer_precinct)}
                    ${createDetailItem('Issuer Code', violation.issuer_code)}
                    ${createDetailItem('Issuer Command', violation.issuer_command)}
                    ${createDetailItem('Issuer Squad', violation.issuer_squad)}
                </div>

                ${fine || penalty || interest || reduction || amountPaid ? `
                <div class="financial-summary">
                    <h4>Financial Breakdown</h4>
                    <div class="financial-grid">
                        ${fine ? `
                        <div class="financial-item">
                            <span class="financial-label">Fine Amount</span>
                            <span class="financial-value">$${formatCurrency(fine)}</span>
                        </div>` : ''}
                        ${penalty ? `
                        <div class="financial-item">
                            <span class="financial-label">Penalty</span>
                            <span class="financial-value">$${formatCurrency(penalty)}</span>
                        </div>` : ''}
                        ${interest ? `
                        <div class="financial-item">
                            <span class="financial-label">Interest</span>
                            <span class="financial-value">$${formatCurrency(interest)}</span>
                        </div>` : ''}
                        ${reduction ? `
                        <div class="financial-item">
                            <span class="financial-label">Reduction</span>
                            <span class="financial-value" style="color: #2e7d32;">-$${formatCurrency(reduction)}</span>
                        </div>` : ''}
                        ${amountPaid ? `
                        <div class="financial-item">
                            <span class="financial-label">Amount Paid</span>
                            <span class="financial-value" style="color: #2e7d32;">$${formatCurrency(amountPaid)}</span>
                        </div>` : ''}
                        <div class="financial-item" style="border-top: 2px solid #e0e0e0; padding-top: 12px; grid-column: 1 / -1;">
                            <span class="financial-label" style="font-weight: 700; color: #1a1a1a;">Balance Due</span>
                            <span class="financial-value" style="font-size: 18px; color: ${status === 'paid' ? '#2e7d32' : '#d32f2f'};">$${formatCurrency(amountDue)}</span>
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('results').innerHTML = htmlContent;
    document.getElementById('totalViolations').textContent = totalViolations;
    document.getElementById('totalAmountDue').textContent = `$${formatCurrency(totalAmountDue)}`;
    document.getElementById('totalPaymentAmount').textContent = `$${formatCurrency(totalPaymentAmount)}`;
}

function displayControls() {
    let controlsContainer = document.getElementById('controlsContainer');
    controlsContainer.innerHTML = `
        <div class="controls">
            <div class="control-group">
                <label for="sortSelect">Sort By</label>
                <select id="sortSelect" onchange="handleSort(this.value)">
                    <option value="">-- Select Option --</option>
                    <option value="date-desc">Issue Date (Newest First)</option>
                    <option value="date-asc">Issue Date (Oldest First)</option>
                    <option value="amount-desc">Amount Due (High to Low)</option>
                    <option value="amount-asc">Amount Due (Low to High)</option>
                    <option value="violation">Violation Type (A-Z)</option>
                    <option value="status">Payment Status</option>
                </select>
            </div>

            <div class="control-group">
                <label for="filterStatus">Filter by Status</label>
                <select id="filterStatus" onchange="handleFilter()">
                    <option value="all">All Violations</option>
                    <option value="outstanding">Outstanding Only</option>
                    <option value="paid">Paid Only</option>
                    <option value="partial">Partially Paid Only</option>
                </select>
            </div>

            <div class="control-group">
                <label for="filterAgency">Filter by Agency</label>
                <select id="filterAgency" onchange="handleFilter()">
                    <option value="all">All Agencies</option>
                </select>
            </div>
        </div>
    `;

    // Populate agency filter
    populateAgencyFilter();
}

function populateAgencyFilter() {
    let currentResults = JSON.parse(localStorage.getItem('currentResults')) || [];
    let agencies = new Set();

    currentResults.forEach(violation => {
        if (violation.issuing_agency) {
            agencies.add(violation.issuing_agency);
        }
    });

    let agencySelect = document.getElementById('filterAgency');
    Array.from(agencies).sort().forEach(agency => {
        let option = document.createElement('option');
        option.value = agency;
        option.textContent = agency;
        agencySelect.appendChild(option);
    });
}

function removeControls() {
    let controlsContainer = document.getElementById('controlsContainer');
    if (controlsContainer) {
        controlsContainer.innerHTML = '';
    }
}

function clearTotals() {
    document.getElementById('totalViolations').textContent = '0';
    document.getElementById('totalAmountDue').textContent = '$0.00';
    document.getElementById('totalPaymentAmount').textContent = '$0.00';
    localStorage.removeItem('currentResults');
}

function handleSort(sortBy) {
    let currentResults = JSON.parse(localStorage.getItem('currentResults')) || [];

    switch(sortBy) {
        case 'date-desc':
            currentResults.sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0));
            break;
        case 'date-asc':
            currentResults.sort((a, b) => new Date(a.issue_date || 0) - new Date(b.issue_date || 0));
            break;
        case 'amount-desc':
            currentResults.sort((a, b) => parseFloat(b.amount_due || 0) - parseFloat(a.amount_due || 0));
            break;
        case 'amount-asc':
            currentResults.sort((a, b) => parseFloat(a.amount_due || 0) - parseFloat(b.amount_due || 0));
            break;
        case 'violation':
            currentResults.sort((a, b) => (a.violation || '').localeCompare(b.violation || ''));
            break;
        case 'status':
            currentResults.sort((a, b) => {
                const statusOrder = { 'outstanding': 0, 'partial': 1, 'paid': 2 };
                const statusA = getPaymentStatus(a);
                const statusB = getPaymentStatus(b);
                return statusOrder[statusA] - statusOrder[statusB];
            });
            break;
    }

    displayViolations(currentResults);
}

function handleFilter() {
    let allResults = JSON.parse(localStorage.getItem('currentResults')) || [];
    let statusFilter = document.getElementById('filterStatus').value;
    let agencyFilter = document.getElementById('filterAgency').value;

    let filteredResults = allResults.filter(violation => {
        // Status filter
        if (statusFilter !== 'all') {
            const status = getPaymentStatus(violation);
            if (status !== statusFilter) {
                return false;
            }
        }

        // Agency filter
        if (agencyFilter !== 'all') {
            if (violation.issuing_agency !== agencyFilter) {
                return false;
            }
        }

        return true;
    });

    displayViolations(filteredResults);
}
