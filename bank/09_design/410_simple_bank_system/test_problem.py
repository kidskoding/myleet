from solution import Bank


def test_bank_example_sequence():
    bank = Bank([10, 100, 20, 50, 30])
    assert bank.withdraw(3, 10) is True
    assert bank.transfer(5, 1, 20) is True
    assert bank.deposit(5, 20) is True
    assert bank.transfer(3, 4, 15) is False
    assert bank.withdraw(10, 50) is False


def test_bank_invalid_accounts():
    bank = Bank([5])
    assert bank.deposit(0, 1) is False
    assert bank.deposit(2, 1) is False
    assert bank.transfer(1, 2, 1) is False
    assert bank.withdraw(1, 5) is True
    assert bank.withdraw(1, 1) is False


def test_bank_failed_transfer_changes_nothing():
    bank = Bank([10, 0])
    assert bank.transfer(1, 3, 5) is False
    assert bank.withdraw(1, 10) is True


def test_bank_transfer_to_self():
    bank = Bank([10])
    assert bank.transfer(1, 1, 10) is True
    assert bank.withdraw(1, 10) is True
    assert bank.withdraw(1, 1) is False


def test_bank_exact_balance_withdraw():
    bank = Bank([0, 7])
    assert bank.withdraw(1, 0) is True
    assert bank.transfer(2, 1, 7) is True
    assert bank.withdraw(1, 7) is True
    assert bank.withdraw(2, 1) is False
