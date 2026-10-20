package runner

import (
	"encoding/xml"
	"strings"
)

type junitCase struct {
	Name    string     `xml:"name,attr"`
	Failure *junitText `xml:"failure"`
	Error   *junitText `xml:"error"`
	Skipped *junitText `xml:"skipped"`
}

type junitText struct {
	Message string `xml:"message,attr"`
	Body    string `xml:",chardata"`
}

type junitSuite struct {
	Cases  []junitCase  `xml:"testcase"`
	Suites []junitSuite `xml:"testsuite"`
}

func firstLine(s string) string {
	s, _, _ = strings.Cut(strings.TrimSpace(s), "\n")
	return s
}

func ParseJUnit(data []byte) ([]TestResult, error) {
	var root junitSuite
	if err := xml.Unmarshal(data, &root); err != nil {
		return nil, err
	}
	var out []TestResult
	var walk func(s junitSuite)
	walk = func(s junitSuite) {
		for _, c := range s.Cases {
			tr := TestResult{Name: c.Name, Outcome: Passed}
			switch {
			case c.Failure != nil:
				tr.Outcome, tr.Message, tr.Detail = Failed, firstLine(c.Failure.Message), strings.TrimSpace(c.Failure.Body)
			case c.Error != nil:
				tr.Outcome, tr.Message, tr.Detail = Errored, firstLine(c.Error.Message), strings.TrimSpace(c.Error.Body)
			case c.Skipped != nil:
				tr.Outcome, tr.Message = Skipped, firstLine(c.Skipped.Message)
			}
			out = append(out, tr)
		}
		for _, child := range s.Suites {
			walk(child)
		}
	}
	walk(root)
	return out, nil
}
