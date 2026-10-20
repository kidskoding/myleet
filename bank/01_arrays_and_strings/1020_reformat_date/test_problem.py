from solution import reformat_date


def test_reformat_date_th_suffix():
    assert reformat_date("20th Oct 2052") == "2052-10-20"


def test_reformat_date_single_digit_day():
    assert reformat_date("6th Jun 1933") == "1933-06-06"


def test_reformat_date_may():
    assert reformat_date("26th May 1960") == "1960-05-26"


def test_reformat_date_earliest():
    assert reformat_date("1st Jan 1900") == "1900-01-01"


def test_reformat_date_nd_and_rd_suffixes():
    assert reformat_date("22nd Feb 2000") == "2000-02-22"
    assert reformat_date("23rd Mar 2001") == "2001-03-23"


def test_reformat_date_latest():
    assert reformat_date("31st Dec 2100") == "2100-12-31"
