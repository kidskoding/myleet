from solution import maximum_mex


def test_maximum_mex_split_after_full_set():
    assert maximum_mex([0, 1, 0]) == [2, 1]


def test_maximum_mex_take_everything():
    assert maximum_mex([1, 0, 2]) == [3]


def test_maximum_mex_no_zero_gives_many_zeros():
    assert maximum_mex([3, 1]) == [0, 0]


def test_maximum_mex_single_zero():
    assert maximum_mex([0]) == [1]


def test_maximum_mex_all_zeros():
    assert maximum_mex([0, 0, 0]) == [1, 1, 1]


def test_maximum_mex_tail_without_zero():
    assert maximum_mex([1, 0, 1, 2, 5]) == [3, 0]


def test_maximum_mex_repeated_blocks():
    assert maximum_mex([0, 1, 1, 0, 2, 0]) == [3, 1]
