from solution import backspace_compare


def test_backspace_compare_equal():
    assert backspace_compare("ab#c", "ad#c") is True


def test_backspace_compare_not_equal():
    assert backspace_compare("a#c", "b") is False


def test_backspace_compare_both_empty_after_backspaces():
    assert backspace_compare("ab##", "c#d#") is True
