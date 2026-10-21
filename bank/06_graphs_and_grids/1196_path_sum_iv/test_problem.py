from solution import path_sum


def test_path_sum_two_branches():
    assert path_sum([113, 215, 221]) == 12


def test_path_sum_single_branch():
    assert path_sum([113, 221]) == 4


def test_path_sum_root_only():
    assert path_sum([113]) == 3


def test_path_sum_deeper():
    assert path_sum([113, 215, 221, 314, 325]) == 29
