document.getElementById('licenseForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const licensePlate = document.getElementById('licensePlate').value.toUpperCase();
    searchForViolations(licensePlate);
});

function searchForViolations(licensePlate) {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results
    removeSortingOptions();

    let apiEndpoint = `https://data.cityofnewyork.us/resource/nc67-uf89.json?plate=${encodeURIComponent(licensePlate)}`;

    fetch(apiEndpoint)
        .then(response => response.json())
        .then(data => {
            console.log(`Fetched ${data.length} rows`); // Debugger: Log the number of rows fetched

            if (data.length > 0) {
                let states = getUniqueStates(data);
                if (states.length > 1) {
                    askUserToSelectState(states, data, licensePlate);
                } else {
                    displaySortingOptions();
                    displayViolations(data, licensePlate, states[0]);
                }
            } else {
                resultsDiv.innerHTML = 'No violations found for this license plate.';
                clearTotals();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = 'An error occurred while fetching data.';
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

function askUserToSelectState(states, data, licensePlate) {
    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p>Multiple states found for this license plate. Please select a state:</p>';

    states.forEach(state => {
        let button = document.createElement('button');
        button.className = 'state-button';
        button.textContent = state;
        button.onclick = () => displayViolations(data.filter(item => item.state === state), licensePlate, state);
        resultsDiv.appendChild(button);
    });
}

function displayViolations(data, licensePlate = '', state = '') {
    localStorage.setItem('currentResults', JSON.stringify(data));
    if (licensePlate) {
        localStorage.setItem('licensePlate', licensePlate);
    }
    if (state) {
        localStorage.setItem('state', state);
    }

    let totalViolations = data.length;
    let totalAmountDue = data.reduce((sum, violation) => sum + parseFloat(violation.amount_due || 0), 0);
    let totalPaymentAmount = data.reduce((sum, violation) => sum + parseFloat(violation.payment_amount || 0), 0);

    let htmlContent = data.map(violation => `<div>
        <p>Plate: ${violation.plate}</p>
        <p>Violation: ${violation.violation}</p>
        <p>Date: ${violation.issue_date}</p>
        <p>Amount Due: $${violation.amount_due}</p>
        <p>Amount Paid: $${violation.payment_amount || '0.00'}</p>
    </div>`).join('<hr>');

    document.getElementById('results').innerHTML = htmlContent;
    document.getElementById('totalViolations').textContent = `Total Violations: ${totalViolations}`;
    document.getElementById('totalAmountDue').textContent = `Total Amount Due: $${totalAmountDue.toFixed(2)}`;
    document.getElementById('totalPaymentAmount').textContent = `Total Payment Amount: $${totalPaymentAmount.toFixed(2)}`;

    let plate = licensePlate || localStorage.getItem('licensePlate');
    let plateState = state || localStorage.getItem('state');
    if (plate && plateState) {
        document.getElementById('totalsHeader').textContent = `Totals for plate: ${plate}, ${plateState}`;
    } else if (plate) {
        document.getElementById('totalsHeader').textContent = `Totals for plate: ${plate}`;
    } else {
        document.getElementById('totalsHeader').textContent = 'Totals';
    }
}

function displaySortingOptions() {
    let sortOptionsDiv = document.createElement('div');
    sortOptionsDiv.className = 'sort-options';
    sortOptionsDiv.innerHTML = `
        <label for="sortSelect">Sort by:</label>
        <select id="sortSelect" onchange="sortResults(this.value)">
            <option value="">--Select Option--</option>
            <option value="date">Issue Date</option>
            <option value="amountDue">Amount Due</option>
        </select>
    `;
    document.querySelector('.container').insertBefore(sortOptionsDiv, document.querySelector('.content'));
}

function removeSortingOptions() {
    let existingSortOptions = document.querySelector('.sort-options');
    if (existingSortOptions) {
        existingSortOptions.remove();
    }
}

function clearTotals() {
    document.getElementById('totalViolations').textContent = 'Total Violations: 0';
    document.getElementById('totalAmountDue').textContent = 'Total Amount Due: $0';
    document.getElementById('totalPaymentAmount').textContent = 'Total Payment Amount: $0';
    document.getElementById('totalsHeader').textContent = 'Totals';
    localStorage.removeItem('currentResults');
    localStorage.removeItem('licensePlate');
    localStorage.removeItem('state');
}

function sortResults(sortBy) {
    let currentResults = JSON.parse(localStorage.getItem('currentResults')) || [];
    if (sortBy === 'date') {
        currentResults.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    } else if (sortBy === 'amountDue') {
        currentResults.sort((a, b) => parseFloat(b.amount_due) - parseFloat(a.amount_due));
    }
    let plate = localStorage.getItem('licensePlate') || '';
    let state = localStorage.getItem('state') || '';
    displayViolations(currentResults, plate, state);
}
