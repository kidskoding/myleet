from solution import nearest_palindromic


def test_nearest_palindromic_mirror_left_half():
    assert nearest_palindromic("123") == "121"


def test_nearest_palindromic_single_digit():
    assert nearest_palindromic("1") == "0"


def test_nearest_palindromic_already_palindrome():
    assert nearest_palindromic("11") == "9"
    assert nearest_palindromic("99") == "101"


def test_nearest_palindromic_power_of_ten():
    assert nearest_palindromic("10") == "9"
    assert nearest_palindromic("1000") == "999"


def test_nearest_palindromic_odd_length():
    assert nearest_palindromic("12932") == "12921"


def test_nearest_palindromic_large():
    assert nearest_palindromic("807045053224792883") == "807045053350540708"
