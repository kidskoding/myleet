from solution import trap


def test_trap_empty():
    assert trap([]) == 0


def test_trap_no_water():
    assert trap([1, 2, 3, 4]) == 0


def test_trap_normal():
    assert trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]) == 6
