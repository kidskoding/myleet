from solution import Excel


def test_excel_starts_at_zero():
    sheet = Excel(3, "C")
    assert sheet.get(1, "A") == 0
    assert sheet.get(3, "C") == 0


def test_excel_set_and_get():
    sheet = Excel(2, "B")
    sheet.set(2, "B", 9)
    assert sheet.get(2, "B") == 9
    sheet.set(2, "B", 4)
    assert sheet.get(2, "B") == 4


def test_excel_sum_tracks_its_inputs():
    sheet = Excel(3, "C")
    sheet.set(1, "A", 2)
    assert sheet.sum(3, "C", ["A1", "A1:B2"]) == 4
    sheet.set(2, "B", 2)
    assert sheet.get(3, "C") == 6


def test_excel_chained_formulas_propagate():
    sheet = Excel(3, "C")
    sheet.set(1, "A", 1)
    sheet.set(1, "B", 2)
    assert sheet.sum(2, "A", ["A1:B1"]) == 3
    assert sheet.sum(3, "A", ["A2", "A2", "B1"]) == 8
    sheet.set(1, "B", 5)
    assert sheet.get(2, "A") == 6
    assert sheet.get(3, "A") == 17


def test_excel_set_replaces_formula():
    sheet = Excel(2, "B")
    sheet.set(1, "A", 3)
    sheet.sum(2, "B", ["A1"])
    sheet.set(2, "B", 10)
    sheet.set(1, "A", 100)
    assert sheet.get(2, "B") == 10


def test_excel_sum_replaces_previous_formula():
    sheet = Excel(2, "C")
    sheet.set(1, "A", 1)
    sheet.set(1, "C", 7)
    sheet.sum(2, "B", ["A1"])
    assert sheet.sum(2, "B", ["C1:C1"]) == 7
    sheet.set(1, "A", 50)
    assert sheet.get(2, "B") == 7
