from solution import longest_arithmetic


def test_longest_arithmetic_fix_middle_element():
    assert longest_arithmetic([9, 7, 5, 10, 1]) == 5


def test_longest_arithmetic_extend_run_by_one():
    assert longest_arithmetic([1, 2, 6, 7]) == 3


def test_longest_arithmetic_already_constant():
    assert longest_arithmetic([5, 5, 5, 5]) == 4


def test_longest_arithmetic_change_last_element():
    assert longest_arithmetic([1, 2, 3, 4, 100]) == 5


def test_longest_arithmetic_bridge_two_runs():
    assert longest_arithmetic([1, 3, 6, 7, 9, 11]) == 6


def test_longest_arithmetic_odd_gap_cannot_bridge():
    assert longest_arithmetic([1, 10, 2, 30]) == 3
