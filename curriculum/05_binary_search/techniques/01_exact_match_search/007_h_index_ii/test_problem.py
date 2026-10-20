from solution import h_index


def test_h_index_normal():
    assert h_index([0, 1, 3, 5, 6]) == 3


def test_h_index_few_papers():
    assert h_index([1, 2, 100]) == 2


def test_h_index_no_citations():
    assert h_index([0]) == 0


def test_h_index_single_well_cited_paper():
    assert h_index([100]) == 1
