from solution import get_max_function_value


def test_get_max_function_value_cycle():
    assert get_max_function_value([2, 0, 1], 4) == 6


def test_get_max_function_value_chain_into_self_loop():
    assert get_max_function_value([1, 1, 1, 2, 3], 3) == 10


def test_get_max_function_value_single_player():
    assert get_max_function_value([0], 5) == 0


def test_get_max_function_value_two_cycle():
    assert get_max_function_value([1, 0], 3) == 2


def test_get_max_function_value_huge_k_self_loop():
    assert get_max_function_value([1, 1], 10**10) == 10000000001


def test_get_max_function_value_huge_k_cycle():
    assert get_max_function_value([2, 0, 1], 10**10) == 10000000002
