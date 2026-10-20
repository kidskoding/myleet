from solution import strange_printer


def test_strange_printer_two_blocks():
    assert strange_printer("aaabbb") == 2


def test_strange_printer_cover_middle():
    assert strange_printer("aba") == 2


def test_strange_printer_single():
    assert strange_printer("a") == 1


def test_strange_printer_repeat_pattern():
    assert strange_printer("abcabc") == 5


def test_strange_printer_interleaved():
    assert strange_printer("tbgtgb") == 4


def test_strange_printer_alternating():
    assert strange_printer("abab") == 3
