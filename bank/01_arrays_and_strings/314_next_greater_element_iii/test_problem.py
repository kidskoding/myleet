from solution import next_greater_element


def test_next_greater_element_two_digits():
    assert next_greater_element(12) == 21


def test_next_greater_element_descending():
    assert next_greater_element(21) == -1


def test_next_greater_element_single_digit():
    assert next_greater_element(1) == -1


def test_next_greater_element_suffix_reversed():
    assert next_greater_element(230241) == 230412


def test_next_greater_element_repeated_digits():
    assert next_greater_element(115) == 151


def test_next_greater_element_overflows_32_bits():
    assert next_greater_element(2147483486) == -1
