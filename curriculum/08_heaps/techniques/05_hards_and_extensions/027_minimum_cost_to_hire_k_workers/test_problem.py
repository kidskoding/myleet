from solution import mincost_to_hire_workers


def test_mincost_to_hire_workers_normal():
    assert round(mincost_to_hire_workers([10, 20, 5], [70, 50, 30], 2), 5) == 105.0


def test_mincost_to_hire_workers_three_workers():
    cost = mincost_to_hire_workers([3, 1, 10, 10, 1], [4, 8, 2, 2, 7], 3)
    assert round(cost, 5) == 30.66667
