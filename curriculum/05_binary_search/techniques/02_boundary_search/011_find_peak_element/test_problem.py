from solution import find_peak_element


def test_find_peak_element_middle():
    result = find_peak_element([1, 2, 3, 1])
    assert result == 2


def test_find_peak_element_descending():
    result = find_peak_element([3, 2, 1])
    assert result == 0


def test_find_peak_element_ascending():
    result = find_peak_element([1, 2, 3])
    assert result == 2


def test_find_peak_element_single():
    assert find_peak_element([1]) == 0


def test_find_peak_element_two_elements():
    result = find_peak_element([1, 2])
    assert result == 1
