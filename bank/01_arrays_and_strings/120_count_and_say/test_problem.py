from solution import count_and_say


def test_count_and_say_base():
    assert count_and_say(1) == "1"


def test_count_and_say_second_term():
    assert count_and_say(2) == "11"


def test_count_and_say_fourth_term():
    assert count_and_say(4) == "1211"


def test_count_and_say_fifth_term():
    assert count_and_say(5) == "111221"


def test_count_and_say_eighth_term():
    assert count_and_say(8) == "1113213211"
