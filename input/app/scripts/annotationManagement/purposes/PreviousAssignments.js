const _ = require('lodash')
const Config = require('../../Config')
const AnnotationGuide = require('../../definition/AnnotationGuide')

const RETRIEVE_PREVIOUS_ASSIGNMENT_INTERVAL_IN_SECONDS = 60

class PreviousAssignments {
  constructor () {
    this.previousAssignments = []
    this.intervals = {}
  }

  init (callback) {
    console.debug('Initializing previousAssignments')
    // Load previous assignments
    this.reloadPreviousAssignments(() => {
      console.debug('Initialized previousAssignments')
      if (_.isFunction(callback)) {
        callback()
      }
      this.intervals.retrievePreviousAssignment = window.setInterval(() => {
        this.reloadPreviousAssignments()
      }, RETRIEVE_PREVIOUS_ASSIGNMENT_INTERVAL_IN_SECONDS * 1000)
    })
  }

  destroy () {
    if (this.intervals.retrievePreviousAssignment) {
      clearInterval(this.intervals.retrievePreviousAssignment)
    }
  }

  reloadPreviousAssignments (callback) {
    // Get student id
    let studentId = window.abwa.targetManager.fileMetadata.studentId
    window.abwa.annotationServerManager.client.searchAnnotations({
      tag: Config.namespace + ':guide',
      group: window.abwa.groupSelector.currentGroup.id
    }, (err, annotations) => {
      if (err) {
        // Nothing to do
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        let previousAssignments = []
        for (let i = 0; i < annotations.length; i++) {
          AnnotationGuide.fromAnnotation(annotations[i], (rubric) => {
            // If current assignment is previous assignment, don't add
            if (window.abwa.targetManager.fileMetadata.cmid !== rubric.cmid) {
              let previousAssignment = {name: rubric.assignmentName}
              let teacherUrl = rubric.getUrlToStudentAssignmentForTeacher(studentId)
              let studentUrl = rubric.getUrlToStudentAssignmentForStudent(studentId)
              // If it is unable to retrieve the URL, don't add
              if (!_.isNull(teacherUrl) && !_.isNull(studentUrl)) {
                previousAssignment.teacherUrl = teacherUrl
                previousAssignment.studentUrl = studentUrl
                previousAssignments.push(previousAssignment)
              }
            }
          })
        }
        this.previousAssignments = previousAssignments
        console.debug('Updated previous assignments')
        if (_.isFunction(callback)) {
          callback(err)
        }
      }
    })
  }

  retrievePreviousAssignments () {
    return window.abwa.previousAssignments.previousAssignments
  }

  createPreviousAssignmentsUI (previousAssignments) {
    let previousAssignmentsContainer = document.createElement('div')
    previousAssignmentsContainer.className = 'previousAssignmentsContainer'
    for (let i = 0; i < previousAssignments.length; i++) {
      let previousAssignment = previousAssignments[i]
      // Create previous assignment element container
      let previousAssignmentElement = document.createElement('span')
      previousAssignmentElement.className = 'previousAssignmentContainer'
      // Create previous assignment link
      let previousAssignmentLinkElement = document.createElement('a')
      previousAssignmentLinkElement.href = previousAssignment.teacherUrl
      previousAssignmentLinkElement.target = '_blank'
      previousAssignmentLinkElement.innerText = previousAssignment.name
      previousAssignmentLinkElement.className = 'previousAssignmentLink'
      previousAssignmentElement.appendChild(previousAssignmentLinkElement)
      // Create previous assignment append img
      let previousAssignmentAppendElement = document.createElement('img')
      previousAssignmentAppendElement.src = chrome.extension.getURL('images/append.png')
      previousAssignmentAppendElement.title = 'Append the assignment URL'
      previousAssignmentAppendElement.className = 'previousAssignmentAppendButton'
      previousAssignmentAppendElement.dataset.studentUrl = previousAssignment.studentUrl
      previousAssignmentElement.appendChild(previousAssignmentAppendElement)
      previousAssignmentsContainer.appendChild(previousAssignmentElement)
    }
    return previousAssignmentsContainer
  }
}

module.exports = PreviousAssignments