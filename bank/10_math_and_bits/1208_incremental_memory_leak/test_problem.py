from solution import mem_leak


def test_mem_leak_equal_start():
    assert mem_leak(2, 2) == [3, 1, 0]


def test_mem_leak_example_two():
    assert mem_leak(8, 11) == [6, 0, 4]


def test_mem_leak_both_zero():
    assert mem_leak(0, 0) == [1, 0, 0]


def test_mem_leak_one_side_only():
    assert mem_leak(5, 0) == [3, 2, 0]


def test_mem_leak_prefer_memory1_on_tie():
    assert mem_leak(3, 3) == [3, 2, 1]
