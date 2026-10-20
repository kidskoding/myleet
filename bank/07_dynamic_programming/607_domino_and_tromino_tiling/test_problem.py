from solution import num_tilings


def test_num_tilings_three():
    assert num_tilings(3) == 5


def test_num_tilings_one():
    assert num_tilings(1) == 1


def test_num_tilings_two():
    assert num_tilings(2) == 2


def test_num_tilings_small_values():
    assert [num_tilings(n) for n in range(4, 10)] == [11, 24, 53, 117, 258, 569]


def test_num_tilings_large_n_is_taken_mod():
    assert num_tilings(30) == 312342182
