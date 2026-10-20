from solution import min_operations


def test_min_operations_one_change():
    assert min_operations("0100") == 1


def test_min_operations_already_alternating():
    assert min_operations("10") == 0


def test_min_operations_all_same():
    assert min_operations("1111") == 2


def test_min_operations_single_char():
    assert min_operations("0") == 0


def test_min_operations_long_alternating():
    assert min_operations("1010") == 0
