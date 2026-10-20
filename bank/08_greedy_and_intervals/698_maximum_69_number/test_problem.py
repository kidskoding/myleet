from solution import maximum69_number


def test_maximum69_number_change_second_digit():
    assert maximum69_number(9669) == 9969


def test_maximum69_number_change_last_digit():
    assert maximum69_number(9996) == 9999


def test_maximum69_number_all_nines():
    assert maximum69_number(9999) == 9999


def test_maximum69_number_single_six():
    assert maximum69_number(6) == 9


def test_maximum69_number_all_sixes():
    assert maximum69_number(666) == 966
