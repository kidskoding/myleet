from solution import max_subarrays


def test_max_subarrays_example_one():
    assert max_subarrays(4, [[2, 3], [1, 4]]) == 9


def test_max_subarrays_example_two():
    assert max_subarrays(5, [[1, 2], [2, 5], [3, 5]]) == 12


def test_max_subarrays_two_nodes():
    # Removing the only pair leaves every non-empty subarray valid: 3.
    assert max_subarrays(2, [[1, 2]]) == 3
