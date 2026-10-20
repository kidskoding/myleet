from solution import min_transfers


def test_min_transfers_example():
    assert min_transfers([[0, 1, 10], [2, 0, 5]]) == 2


def test_min_transfers_partial_cancel():
    assert min_transfers([[0, 1, 10], [1, 0, 1], [1, 2, 5], [2, 0, 5]]) == 1


def test_min_transfers_no_transactions():
    assert min_transfers([]) == 0


def test_min_transfers_already_even():
    assert min_transfers([[0, 1, 5], [1, 0, 5]]) == 0


def test_min_transfers_chain_collapses():
    assert min_transfers([[0, 1, 1], [1, 2, 1], [2, 3, 1]]) == 1


def test_min_transfers_grouping_matters():
    transactions = [[0, 1, 5], [2, 4, 2], [2, 5, 2], [3, 5, 1]]
    assert min_transfers(transactions) == 4
