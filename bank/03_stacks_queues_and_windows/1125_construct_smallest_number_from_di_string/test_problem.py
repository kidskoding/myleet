from solution import smallest_number


def test_smallest_number_mixed_pattern():
    assert smallest_number("IIIDIDDD") == "123549876"


def test_smallest_number_all_decreasing():
    assert smallest_number("DDD") == "4321"


def test_smallest_number_single_increase():
    assert smallest_number("I") == "12"


def test_smallest_number_single_decrease():
    assert smallest_number("D") == "21"


def test_smallest_number_alternating():
    assert smallest_number("IDID") == "13254"


def test_smallest_number_longest_patterns():
    assert smallest_number("IIIIIIII") == "123456789"
    assert smallest_number("DDDDDDDD") == "987654321"
