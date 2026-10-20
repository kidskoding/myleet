class Bank:
    def __init__(self, balance: list[int]) -> None:
        # Time: O(n).
        # Space: O(n).
        self.balance = list(balance)

    def _valid(self, account: int) -> bool:
        return 1 <= account <= len(self.balance)

    def transfer(self, account1: int, account2: int, money: int) -> bool:
        # Time: O(1).
        # Space: O(1).
        if not (self._valid(account1) and self._valid(account2)) or self.balance[account1 - 1] < money:
            return False
        self.balance[account1 - 1] -= money
        self.balance[account2 - 1] += money
        return True

    def deposit(self, account: int, money: int) -> bool:
        # Time: O(1).
        # Space: O(1).
        if not self._valid(account):
            return False
        self.balance[account - 1] += money
        return True

    def withdraw(self, account: int, money: int) -> bool:
        # Time: O(1).
        # Space: O(1).
        if not self._valid(account) or self.balance[account - 1] < money:
            return False
        self.balance[account - 1] -= money
        return True
