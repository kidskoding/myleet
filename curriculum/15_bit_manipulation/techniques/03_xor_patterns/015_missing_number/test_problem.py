from solution import missing_number


def test_missing_number_normal():
    assert missing_number([3, 0, 1]) == 2


def test_missing_number_missing_last():
    assert missing_number([0, 1]) == 2


def test_missing_number_missing_first():
    assert missing_number([1, 2]) == 0


def test_missing_number_single_element_missing():
    assert missing_number([1]) == 0


def test_missing_number_empty():
    assert missing_number([]) == 0
