from solution import rearrange_array


def test_rearrange_array_alternates_signs():
    assert rearrange_array([3, 1, -2, -5, 2, -4]) == [3, -2, 1, -5, 2, -4]


def test_rearrange_array_shortest():
    assert rearrange_array([-1, 1]) == [1, -1]
