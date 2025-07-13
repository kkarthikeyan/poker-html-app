// Poker Money Tracker with Local Storage
class PokerMoneyTracker {
    constructor() {
        // Constants
        this.STORAGE_KEYS = {
            PLAYERS: 'players',
            TRANSACTIONS: 'transactions'
        };
        
        this.MAX_PLAYER_NAME_LENGTH = 20;
        
        this.players = this.loadData(this.STORAGE_KEYS.PLAYERS) || [];
        this.transactions = this.loadData(this.STORAGE_KEYS.TRANSACTIONS) || [];
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderPlayers();
        this.renderTransactionHistory();
        this.updatePlayerSelects();
        this.updateButtonStates();
    }

    // Mobile haptic feedback
    vibrate(pattern = [50]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    cacheElements() {
        this.elements = {
            playerNameInput: document.getElementById('playerNameInput'),
            addPlayerBtn: document.getElementById('addPlayerBtn'),
            borrowPlayerSelect: document.getElementById('borrowPlayerSelect'),
            borrowBtn: document.getElementById('borrowBtn'),
            customAmountInput: document.getElementById('customAmountInput'),
            settlePlayerSelect: document.getElementById('settlePlayerSelect'),
            settlementAmount: document.getElementById('settlementAmount'),
            settleBtn: document.getElementById('settleBtn'),
            playersTableBody: document.getElementById('playersTableBody'),
            playersTable: document.getElementById('playersTable'),
            playersEmptyState: document.getElementById('playersEmptyState'),
            transactionList: document.getElementById('transactionList'),
            resetBtn: document.getElementById('resetBtn'),
            whatsappBtn: document.getElementById('whatsappBtn')
        };
    }

    bindEvents() {
        // Player management
        this.elements.addPlayerBtn.addEventListener('click', () => this.addPlayer());
        this.elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPlayer();
        });

        // Borrowing
        this.elements.borrowBtn.addEventListener('click', () => this.borrowMoney());

        // Settlement
        this.elements.settleBtn.addEventListener('click', () => this.settleMoney());
        this.elements.settlementAmount.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.settleMoney();
        });

        // Custom amount input and validation
        this.elements.customAmountInput.addEventListener('input', () => {
            this.updateButtonStates();
        });
        this.elements.customAmountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.borrowMoney();
        });

        // Settlement amount validation
        this.elements.settlementAmount.addEventListener('input', () => {
            this.updateButtonStates();
        });

        // Player select validation
        this.elements.borrowPlayerSelect.addEventListener('change', () => {
            this.updateButtonStates();
        });

        this.elements.settlePlayerSelect.addEventListener('change', () => {
            this.updateButtonStates();
        });

        // Reset button
        this.elements.resetBtn.addEventListener('click', () => this.resetGame());

        // WhatsApp share button
        this.elements.whatsappBtn.addEventListener('click', () => this.shareToWhatsApp());
    }

    updateButtonStates() {
        // Borrow button validation
        const hasPlayer = this.elements.borrowPlayerSelect.value !== '';
        const hasAmount = this.getSelectedAmount() > 0;
        this.elements.borrowBtn.disabled = !(hasPlayer && hasAmount);

        // Settle button validation
        const hasSettlePlayer = this.elements.settlePlayerSelect.value !== '';
        const hasSettleAmount = parseFloat(this.elements.settlementAmount.value) > 0;
        this.elements.settleBtn.disabled = !(hasSettlePlayer && hasSettleAmount);
    }

    addPlayer() {
        const name = this.elements.playerNameInput.value.trim();

        if (name === '') {
            alert('Please enter a player name!');
            return;
        }

        if (name.length > this.MAX_PLAYER_NAME_LENGTH) {
            alert(`Player name must be ${this.MAX_PLAYER_NAME_LENGTH} characters or less!`);
            return;
        }

        if (this.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('Player with this name already exists!');
            return;
        }

        const player = {
            id: Date.now().toString(),
            name: name,
            borrowed: 0,
            settled: 0,
            balance: 0
        };

        this.players.push(player);
        this.saveData(this.STORAGE_KEYS.PLAYERS, this.players);
        
        // Haptic feedback
        this.vibrate([30]);
        
        // Clear input immediately
        this.elements.playerNameInput.value = '';
        
        // Update all UI components
        this.renderPlayers();
        this.renderTransactionHistory();
        this.updatePlayerSelects();
        this.updateButtonStates();
    }

    removePlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        if (player.balance !== 0) {
            if (!confirm(`${player.name} has a balance of $${player.balance}. Are you sure you want to remove them?`)) {
                return;
            }
        }

        this.players = this.players.filter(p => p.id !== playerId);
        this.transactions = this.transactions.filter(t => t.playerId !== playerId);
        
        this.saveData(this.STORAGE_KEYS.PLAYERS, this.players);
        this.saveData(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);
        
        this.renderPlayers();
        this.renderTransactionHistory();
        this.updatePlayerSelects();
        this.updateButtonStates();
    }



    getSelectedAmount() {
        const customAmount = this.elements.customAmountInput.value;
        return customAmount ? parseFloat(customAmount) : 0;
    }

    borrowMoney() {
        const playerId = this.elements.borrowPlayerSelect.value;
        const amount = this.getSelectedAmount();

        if (!playerId) {
            alert('Please select a player!');
            return;
        }

        if (amount <= 0) {
            alert('Please select or enter a valid amount!');
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Update player balance
        player.borrowed += amount;
        player.balance -= amount;

        // Add transaction
        this.addTransaction(playerId, player.name, 'borrow', amount);
        
        this.saveData(this.STORAGE_KEYS.PLAYERS, this.players);
        
        // Haptic feedback
        this.vibrate([40]);
        
        this.renderPlayers();
        this.renderTransactionHistory();
        
        // Clear form
        this.clearBorrowForm();
    }

    settleMoney() {
        const playerId = this.elements.settlePlayerSelect.value;
        const amount = parseFloat(this.elements.settlementAmount.value);

        if (!playerId) {
            alert('Please select a player!');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid settlement amount!');
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Update player balance
        player.settled += amount;
        player.balance += amount;

        // Add transaction
        this.addTransaction(playerId, player.name, 'settle', amount);
        
        this.saveData(this.STORAGE_KEYS.PLAYERS, this.players);
        
        // Haptic feedback (different pattern for settlement)
        this.vibrate([20, 20, 40]);
        
        this.renderPlayers();
        this.renderTransactionHistory();
        
        // Clear form
        this.clearSettleForm();
    }

    renderPlayers() {
        if (this.players.length === 0) {
            this.elements.playersTable.style.display = 'none';
            this.elements.playersEmptyState.style.display = 'block';
            return;
        }

        this.elements.playersTable.style.display = 'table';
        this.elements.playersEmptyState.style.display = 'none';
        this.elements.playersTableBody.innerHTML = '';

        // Add player rows
        this.players.forEach((player, index) => {
            const row = document.createElement('tr');
            
            const balanceClass = this.getBalanceClass(player.balance);
            const balanceText = this.formatBalance(player.balance);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="player-name">${player.name}</div>
                </td>
                <td>
                    <div class="player-balance ${balanceClass}">${balanceText}</div>
                </td>
                <td>
                    <button class="player-borrow-btn" onclick="pokerTracker.quickBorrow('${player.id}', 10)">
                        + $10
                    </button>
                </td>
                <td>
                    <button class="player-remove-btn" onclick="pokerTracker.removePlayer('${player.id}')">
                        ×
                    </button>
                </td>
            `;
            
            this.elements.playersTableBody.appendChild(row);
        });

        // Add total row
        const totalBalance = this.players.reduce((sum, player) => sum + player.balance, 0);
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        
        const totalBalanceClass = this.getBalanceClass(totalBalance);
        const totalBalanceText = this.formatBalance(totalBalance);
        
        totalRow.innerHTML = `
            <td></td>
            <td><strong>Total</strong></td>
            <td><strong class="player-balance ${totalBalanceClass}">${totalBalanceText}</strong></td>
            <td></td>
            <td></td>
        `;
        
        this.elements.playersTableBody.appendChild(totalRow);
    }

    quickBorrow(playerId, amount) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Update player balance
        player.borrowed += amount;
        player.balance -= amount;

        // Add transaction
        this.addTransaction(playerId, player.name, 'borrow', amount);
        
        this.saveData(this.STORAGE_KEYS.PLAYERS, this.players);
        
        this.renderPlayers();
        this.renderTransactionHistory();
    }

    renderTransactionHistory() {
        if (this.transactions.length === 0) {
            this.elements.transactionList.innerHTML = '<div class="empty-state" id="historyEmptyState"><p>No transactions yet.</p></div>';
            return;
        }

        // Clear transaction list
        this.elements.transactionList.innerHTML = '';

        // Sort transactions by timestamp (newest first)
        const sortedTransactions = [...this.transactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        sortedTransactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            // Extract time in HH:MM format
            const timeOnly = new Date(transaction.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            transactionItem.innerHTML = `
                <div class="transaction-content">
                    <span class="transaction-player ${transaction.type}">${transaction.playerName}</span>
                    <span class="transaction-amount ${transaction.type === 'borrow' ? 'negative' : 'positive'}">
                        ${transaction.type === 'borrow' ? '-' : '+'}$${transaction.amount}
                    </span>
                    <span class="transaction-time">${timeOnly}</span>
                </div>
            `;
            fragment.appendChild(transactionItem);
        });
        
        this.elements.transactionList.appendChild(fragment);
    }

    updatePlayerSelects() {
        // Store current values
        const currentBorrowValue = this.elements.borrowPlayerSelect.value;
        const currentSettleValue = this.elements.settlePlayerSelect.value;

        // Clear existing options (except first one)
        this.elements.borrowPlayerSelect.innerHTML = '<option value="">Select player...</option>';
        this.elements.settlePlayerSelect.innerHTML = '<option value="">Select player...</option>';

        this.players.forEach(player => {
            const borrowOption = document.createElement('option');
            borrowOption.value = player.id;
            borrowOption.textContent = player.name;
            this.elements.borrowPlayerSelect.appendChild(borrowOption);

            const settleOption = document.createElement('option');
            settleOption.value = player.id;
            settleOption.textContent = player.name;
            this.elements.settlePlayerSelect.appendChild(settleOption);
        });

        // Restore values if they still exist
        if (this.players.find(p => p.id === currentBorrowValue)) {
            this.elements.borrowPlayerSelect.value = currentBorrowValue;
        }
        if (this.players.find(p => p.id === currentSettleValue)) {
            this.elements.settlePlayerSelect.value = currentSettleValue;
        }
    }

    addTransaction(playerId, playerName, type, amount) {
        const transaction = {
            id: Date.now().toString(),
            playerId: playerId,
            playerName: playerName,
            type: type,
            amount: amount,
            timestamp: new Date().toLocaleString()
        };

        this.transactions.push(transaction);
        this.saveData(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);
    }

    getBalanceClass(balance) {
        return balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero';
    }

    formatBalance(balance) {
        return balance > 0 ? `+$${balance}` : `$${balance}`;
    }

    resetGame() {
        const confirmed = confirm('Are you sure you want to reset the game? This will clear all players and transaction history. This action cannot be undone.');
        
        if (confirmed) {
            // Clear localStorage
            localStorage.removeItem(this.STORAGE_KEYS.PLAYERS);
            localStorage.removeItem(this.STORAGE_KEYS.TRANSACTIONS);
            
            // Reset app state
            this.players = [];
            this.transactions = [];
            
            // Clear all forms
            this.elements.playerNameInput.value = '';
            this.clearBorrowForm();
            this.clearSettleForm();
            
            // Re-render everything
            this.renderPlayers();
            this.renderTransactionHistory();
            this.updatePlayerSelects();
            this.updateButtonStates();
            
            console.log('Game reset successfully');
        }
    }

    shareToWhatsApp() {
        if (this.players.length === 0) {
            alert('No players to share! Add some players first.');
            return;
        }

        // Format the message with simple characters
        let message = '*Game Summary*%0A%0A';
        
        // Add each player
        this.players.forEach((player, index) => {
            const balanceText = player.balance > 0 ? `+${player.balance}` : `${player.balance}`;
            message += `${index + 1}. ${player.name}: ${balanceText}%0A`;
        });

        // Add total
        const totalBalance = this.players.reduce((sum, player) => sum + player.balance, 0);
        const totalText = totalBalance > 0 ? `+${totalBalance}` : `${totalBalance}`;
        message += `%0A*Outstanding Chips: ${totalText}*%0A%0A`;

        // Add timestamp
        const now = new Date();
        const timeString = now.toLocaleString();
        message += `Generated: ${timeString}`;

        // Create WhatsApp URL (message is already URL-encoded)
        const whatsappUrl = `https://wa.me/?text=${message}`;
        
        // Open WhatsApp
        window.open(whatsappUrl, '_blank');
    }

    clearBorrowForm() {
        this.elements.customAmountInput.value = '';
        this.elements.borrowPlayerSelect.value = '';
        this.updateButtonStates();
    }

    clearSettleForm() {
        this.elements.settlementAmount.value = '';
        this.elements.settlePlayerSelect.value = '';
        this.updateButtonStates();
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            
            // Handle specific localStorage errors
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded. Please clear some data or export your current game.');
            } else if (error.name === 'SecurityError') {
                alert('Cannot access localStorage. Please check your browser settings.');
            } else {
                alert(`Error saving ${key}. Please check if localStorage is available.`);
            }
        }
    }

    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return null;
        }
    }

    exportData() {
        const data = {
            players: this.players,
            transactions: this.transactions,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `poker_game_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
    }
}

// Initialize the poker tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pokerTracker = new PokerMoneyTracker();
});

 