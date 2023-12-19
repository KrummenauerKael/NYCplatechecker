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
                    askUserToSelectState(states, data);
                } else {
                    displaySortingOptions();
                    displayViolations(data);
                }
            } else {
                resultsDiv.innerHTML = 'No violations found for this license plate.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            resultsDiv.innerHTML = 'An error occurred while fetching data.';
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
    resultsDiv.innerHTML = '<p>Multiple states found for this license plate. Please select a state:</p>';

    states.forEach(state => {
        let button = document.createElement('button');
        button.className = 'state-button';
        button.textContent = state;
        button.onclick = () => displayViolations(data.filter(item => item.state === state));
        resultsDiv.appendChild(button);
    });
}

function displayViolations(data) {
    localStorage.setItem('currentResults', JSON.stringify(data));

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

function sortResults(sortBy) {
    let currentResults = JSON.parse(localStorage.getItem('currentResults')) || [];
    if (sortBy === 'date') {
        currentResults.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    } else if (sortBy === 'amountDue') {
        currentResults.sort((a, b) => parseFloat(b.amount_due) - parseFloat(a.amount_due));
    }
    displayViolations(currentResults);
}
