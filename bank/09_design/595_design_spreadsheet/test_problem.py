from solution import Spreadsheet


def test_spreadsheet_example():
    sheet = Spreadsheet(3)
    assert sheet.get_value("=5+7") == 12
    sheet.set_cell("A1", 10)
    assert sheet.get_value("=A1+6") == 16
    sheet.set_cell("B2", 15)
    assert sheet.get_value("=A1+B2") == 25
    sheet.reset_cell("A1")
    assert sheet.get_value("=A1+B2") == 15


def test_spreadsheet_unset_cell_is_zero():
    sheet = Spreadsheet(3)
    assert sheet.get_value("=Z3+0") == 0
    assert sheet.get_value("=0+0") == 0


def test_spreadsheet_same_cell_twice():
    sheet = Spreadsheet(2)
    sheet.set_cell("C2", 7)
    assert sheet.get_value("=C2+C2") == 14


def test_spreadsheet_multi_digit_row_and_limits():
    sheet = Spreadsheet(1000)
    sheet.set_cell("A1000", 100000)
    assert sheet.get_value("=A1000+100000") == 200000
    assert sheet.get_value("=A100+A1000") == 100000


def test_spreadsheet_overwrite_cell():
    sheet = Spreadsheet(1)
    sheet.set_cell("A1", 5)
    sheet.set_cell("A1", 9)
    assert sheet.get_value("=1+A1") == 10
