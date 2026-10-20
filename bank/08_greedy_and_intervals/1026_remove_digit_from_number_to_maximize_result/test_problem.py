from solution import remove_digit


def test_remove_digit_single_occurrence():
    assert remove_digit("123", "3") == "12"


def test_remove_digit_two_occurrences_same_result():
    assert remove_digit("1231", "1") == "231"


def test_remove_digit_first_of_pair():
    assert remove_digit("551", "5") == "51"


def test_remove_digit_prefers_larger_follower():
    assert remove_digit("133235", "3") == "13325"


def test_remove_digit_falls_back_to_last():
    assert remove_digit("9191", "9") == "911"


def test_remove_digit_two_digit_number():
    assert remove_digit("11", "1") == "1"
