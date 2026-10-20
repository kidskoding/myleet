from solution import mincost_tickets


def test_mincost_tickets_example():
    assert mincost_tickets([1, 4, 6, 7, 8, 20], [2, 7, 15]) == 11


def test_mincost_tickets_month_pass():
    assert mincost_tickets([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31], [2, 7, 15]) == 17


def test_mincost_tickets_single_day():
    assert mincost_tickets([1], [2, 7, 15]) == 2


def test_mincost_tickets_week_pass_cheaper_than_day():
    assert mincost_tickets([1, 2, 3], [5, 3, 20]) == 3


def test_mincost_tickets_full_month():
    assert mincost_tickets(list(range(1, 31)), [2, 7, 15]) == 15
