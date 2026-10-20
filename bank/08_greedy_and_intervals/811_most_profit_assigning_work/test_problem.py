from solution import max_profit_assignment


def test_max_profit_assignment_everyone_works():
    assert max_profit_assignment([2, 4, 6, 8, 10], [10, 20, 30, 40, 50], [4, 5, 6, 7]) == 100


def test_max_profit_assignment_nobody_qualifies():
    assert max_profit_assignment([85, 47, 57], [24, 66, 99], [40, 25, 25]) == 0


def test_max_profit_assignment_easier_job_pays_more():
    assert max_profit_assignment([1, 5], [50, 10], [5, 6]) == 100


def test_max_profit_assignment_shared_job():
    assert max_profit_assignment([3], [7], [3, 3, 3]) == 21


def test_max_profit_assignment_same_difficulty():
    assert max_profit_assignment([2, 2], [5, 9], [2, 1]) == 9
